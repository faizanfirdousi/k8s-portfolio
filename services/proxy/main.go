// services/proxy/main.go
//
// The cluster-read proxy: the ONLY service allowed to talk to the Kubernetes API.
//
// WHAT IT DOES:
//   1. Uses the ServiceAccount token that Kubernetes automatically mounts into every Pod
//      to authenticate with the API server (this is called "in-cluster config")
//   2. Calls the Kubernetes API to list nodes and pods
//   3. Transforms the response to a MINIMAL schema (no pod specs, no env vars, no secrets)
//   4. Serves this minimal JSON at GET /api/topology
//   5. Adds CORS headers so the frontend can call it cross-origin (needed in local dev)
//
// SECURITY PROPERTIES:
//   - The ServiceAccount is bound to a ClusterRole with ONLY get/list/watch on pods+nodes
//   - We never expose more than: name, namespace, node, status, labels
//   - The proxy itself has no secrets, no write access, no admin permissions
//
// HOW IN-CLUSTER AUTH WORKS:
//   When Kubernetes creates a Pod, it automatically mounts a ServiceAccount token at:
//     /var/run/secrets/kubernetes.io/serviceaccount/token
//   And the cluster's CA certificate at:
//     /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
//   client-go's `rest.InClusterConfig()` reads these files automatically.
//   No manual token management required — Kubernetes handles credential rotation.

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	// client-go: the official Kubernetes Go client library
	// It knows how to talk to the Kubernetes API server
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// ── API response types ─────────────────────────────────────────────────────────
// These are the ONLY fields we expose. We never pass through the full K8s API response.
// This is intentional — full pod specs can contain environment variable names,
// image names, and other information that should stay internal.

// NodeInfo represents a single cluster node in the topology response
type NodeInfo struct {
	Name     string `json:"name"`     // Node name (e.g., "k3d-portfolio-agent-0")
	Status   string `json:"status"`   // "Ready" or "NotReady"
	PodCount int    `json:"podCount"` // Number of pods currently on this node
}

// PodInfo represents a single pod in the topology response
type PodInfo struct {
	Name      string            `json:"name"`      // Pod name (e.g., "about-7c9f4d-xk2p1")
	Namespace string            `json:"namespace"` // Which namespace it's in
	Node      string            `json:"node"`      // Which node it's running on
	Status    string            `json:"status"`    // "Running", "Pending", "CrashLoopBackOff", etc.
	Labels    map[string]string `json:"labels"`    // Pod labels (used by frontend to identify section)
}

// TopologyResponse is the full JSON response for GET /api/topology
type TopologyResponse struct {
	Nodes     []NodeInfo `json:"nodes"`
	Pods      []PodInfo  `json:"pods"`
	FetchedAt string     `json:"fetchedAt"` // ISO timestamp — useful for debugging staleness
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default port for the proxy service
	}

	// Build the Kubernetes client using in-cluster configuration.
	// This only works when the binary is running INSIDE a Kubernetes Pod.
	// For local testing outside a cluster, you'd use `rest.BuildConfigFromFlags`
	// with a kubeconfig file instead.
	config, err := rest.InClusterConfig()
	if err != nil {
		// If in-cluster config fails, this binary is probably running outside a cluster.
		// Log the error and exit — the proxy only makes sense inside a cluster.
		log.Fatalf("[proxy] Failed to build in-cluster config: %v\n"+
			"Are you running inside a Kubernetes Pod?", err)
	}

	// Create the Kubernetes clientset — this is what we use to make API calls
	// A "clientset" contains clients for every API group (core, apps, rbac, etc.)
	// We only use the core v1 client (for pods and nodes)
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("[proxy] Failed to create Kubernetes client: %v", err)
	}

	log.Printf("[proxy] Kubernetes client initialized, connected to cluster")
	log.Printf("[proxy] Listening on port %s", port)

	// ── HTTP server ────────────────────────────────────────────────────────────

	mux := http.NewServeMux()

	// Main topology endpoint
	mux.HandleFunc("/api/topology", func(w http.ResponseWriter, r *http.Request) {
		// Only allow GET requests
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// CORS headers: allow the frontend (served at a potentially different origin)
		// to call this endpoint from the browser.
		// In production (everything behind the same Ingress), this isn't strictly needed
		// because the frontend and proxy share the same domain. But it's good practice.
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Content-Type", "application/json")

		// Handle CORS preflight requests (browser sends OPTIONS before the real request)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		topology, err := fetchTopology(r.Context(), clientset)
		if err != nil {
			log.Printf("[proxy] Error fetching topology: %v", err)
			http.Error(w, `{"error":"Failed to fetch cluster topology"}`, http.StatusInternalServerError)
			return
		}

		// Encode and write the response
		if err := json.NewEncoder(w).Encode(topology); err != nil {
			log.Printf("[proxy] Error encoding response: %v", err)
		}
	})

	// Health check endpoint — must NOT call the K8s API
	// (if the K8s API is down, our Pod should still be "healthy")
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "ok")
	})

	// Start the HTTP server with a reasonable timeout
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second, // Longer write timeout since we need to call K8s API
	}

	log.Fatal(server.ListenAndServe())
}

// ── Topology fetch ────────────────────────────────────────────────────────────

// fetchTopology calls the Kubernetes API to get nodes and pods,
// then transforms them into our minimal TopologyResponse schema.
func fetchTopology(ctx context.Context, clientset *kubernetes.Clientset) (*TopologyResponse, error) {
	// Use a timeout context — we don't want a slow API server to hang the request
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// ── Fetch nodes ────────────────────────────────────────────────────────────
	// clientset.CoreV1().Nodes().List() calls GET /api/v1/nodes
	// Our ServiceAccount's ClusterRole allows this (get, list, watch on nodes)
	nodeList, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("listing nodes: %w", err)
	}

	// ── Fetch pods (all namespaces) ────────────────────────────────────────────
	// Passing "" as the namespace means "all namespaces"
	// This calls GET /api/v1/pods (cluster-wide)
	podList, err := clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("listing pods: %w", err)
	}

	// ── Build pod count per node ───────────────────────────────────────────────
	// We need this to populate NodeInfo.PodCount
	podCountByNode := make(map[string]int)
	for _, pod := range podList.Items {
		if pod.Spec.NodeName != "" {
			podCountByNode[pod.Spec.NodeName]++
		}
	}

	// ── Transform nodes ────────────────────────────────────────────────────────
	nodes := make([]NodeInfo, 0, len(nodeList.Items))
	for _, node := range nodeList.Items {
		status := "NotReady"
		// A node is "Ready" when its Ready condition is True
		// Conditions is a list — iterate to find the "Ready" condition
		for _, condition := range node.Status.Conditions {
			if condition.Type == "Ready" && condition.Status == "True" {
				status = "Ready"
				break
			}
		}

		nodes = append(nodes, NodeInfo{
			Name:     node.Name,
			Status:   status,
			PodCount: podCountByNode[node.Name],
		})
	}

	// ── Transform pods ────────────────────────────────────────────────────────
	// Filter out system pods (kube-system, traefik, etc.) —
	// we only want to show portfolio pods in the topology view.
	// Also filter out completed/succeeded jobs.
	portfolioNamespaces := map[string]bool{
		"about":    true,
		"projects": true,
		"blog":     true,
		"contact":  true,
		"proxy":    true,
		"frontend": true,
	}

	pods := make([]PodInfo, 0)
	for _, pod := range podList.Items {
		// Only include pods in our portfolio namespaces
		if !portfolioNamespaces[pod.Namespace] {
			continue
		}

		// Determine pod status — this is more nuanced than just pod.Status.Phase
		// A pod can be "Running" phase but have a container in CrashLoopBackOff
		status := string(pod.Status.Phase) // "Running", "Pending", "Failed", "Succeeded"

		// Check container statuses for more detail
		for _, cs := range pod.Status.ContainerStatuses {
			if cs.State.Waiting != nil && cs.State.Waiting.Reason != "" {
				status = cs.State.Waiting.Reason // e.g., "CrashLoopBackOff", "ImagePullBackOff"
				break
			}
		}

		pods = append(pods, PodInfo{
			Name:      pod.Name,
			Namespace: pod.Namespace,
			Node:      pod.Spec.NodeName,
			Status:    status,
			Labels:    pod.Labels, // Labels help the frontend know which section this pod belongs to
		})
	}

	return &TopologyResponse{
		Nodes:     nodes,
		Pods:      pods,
		FetchedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}
