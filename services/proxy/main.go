// services/proxy/main.go
//
// The cluster-read proxy: the ONLY service allowed to talk to the Kubernetes API.
//
// Endpoints:
//   GET /api/topology              — cluster overview (nodes + enriched pods)
//   GET /api/pods/:namespace/:name — single pod detail + recent events
//   GET /api/events?namespace=     — recent events (optional namespace filter)
//   GET /healthz                   — liveness/readiness (no K8s API call)

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

var portfolioNamespaces = map[string]bool{
	"about":    true,
	"projects": true,
	"skills":   true,
	"blog":     true,
	"contact":  true,
	"proxy":    true,
	"frontend": true,
}

// ── API response types ─────────────────────────────────────────────────────────

type ResourceSummary struct {
	CPU    string `json:"cpu,omitempty"`
	Memory string `json:"memory,omitempty"`
}

type ContainerInfo struct {
	Name        string `json:"name"`
	Ready       bool   `json:"ready"`
	Restarts    int32  `json:"restarts"`
	State       string `json:"state"`
	StateReason string `json:"stateReason,omitempty"`
	Image       string `json:"image,omitempty"`
}

type PodInfo struct {
	Name             string            `json:"name"`
	Namespace        string            `json:"namespace"`
	Node             string            `json:"node"`
	Status           string            `json:"status"`
	Labels           map[string]string `json:"labels"`
	Ready            string            `json:"ready"`
	Restarts         int32             `json:"restarts"`
	Age              string            `json:"age"`
	StartedAt        string            `json:"startedAt,omitempty"`
	Containers       []ContainerInfo   `json:"containers"`
	ResourceRequests *ResourceSummary  `json:"resourceRequests,omitempty"`
	ResourceLimits   *ResourceSummary  `json:"resourceLimits,omitempty"`
}

type NodeInfo struct {
	Name     string `json:"name"`
	Status   string `json:"status"`
	PodCount int    `json:"podCount"`
}

type TopologyResponse struct {
	ClusterName    string     `json:"clusterName"`
	ClusterVersion string     `json:"clusterVersion"`
	Nodes          []NodeInfo `json:"nodes"`
	Pods           []PodInfo  `json:"pods"`
	FetchedAt      string     `json:"fetchedAt"`
}

type EventInfo struct {
	Type      string `json:"type"`
	Reason    string `json:"reason"`
	Message   string `json:"message"`
	Object    string `json:"object"`
	Namespace string `json:"namespace"`
	Count     int32  `json:"count"`
	Age       string  `json:"age"`
	LastSeen  string  `json:"lastSeen"`
}

type PodDetailResponse struct {
	PodInfo
	Events []EventInfo `json:"events"`
}

type EventsResponse struct {
	Events    []EventInfo `json:"events"`
	FetchedAt string      `json:"fetchedAt"`
}

type MetricsResponse struct {
	TotalPods           string `json:"totalPods"`
	TotalCpuRequests    string `json:"totalCpuRequests"`
	TotalMemoryRequests string `json:"totalMemoryRequests"`
	FetchedAt           string `json:"fetchedAt"`
}

type PromQueryResult struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Value []interface{} `json:"value"` // [ timestamp, "value" ]
		} `json:"result"`
	} `json:"data"`
}

type errorResponse struct {
	Error string `json:"error"`
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	config, err := rest.InClusterConfig()
	if err != nil {
		log.Fatalf("[proxy] Failed to build in-cluster config: %v\n"+
			"Are you running inside a Kubernetes Pod?", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("[proxy] Failed to create Kubernetes client: %v", err)
	}

	log.Printf("[proxy] Kubernetes client initialized, connected to cluster")
	log.Printf("[proxy] Listening on port %s", port)

	mux := http.NewServeMux()

	mux.HandleFunc("/api/topology", func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}
		setCORS(w, r)
		setSecurityHeaders(w)
		w.Header().Set("Content-Type", "application/json")

		topology, err := fetchTopology(r.Context(), clientset)
		if err != nil {
			log.Printf("[proxy] Error fetching topology: %v", err)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Failed to fetch cluster topology"})
			return
		}
		writeJSON(w, http.StatusOK, topology)
	})

	mux.HandleFunc("/api/events", func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}
		setCORS(w, r)
		setSecurityHeaders(w)
		w.Header().Set("Content-Type", "application/json")

		namespace := r.URL.Query().Get("namespace")
		if namespace != "" && !portfolioNamespaces[namespace] {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Unknown or disallowed namespace"})
			return
		}

		events, err := fetchEvents(r.Context(), clientset, namespace, 30)
		if err != nil {
			log.Printf("[proxy] Error fetching events: %v", err)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Failed to fetch events"})
			return
		}

		writeJSON(w, http.StatusOK, EventsResponse{
			Events:    events,
			FetchedAt: time.Now().UTC().Format(time.RFC3339),
		})
	})

	mux.HandleFunc("/api/metrics", func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}
		setCORS(w, r)
		setSecurityHeaders(w)
		w.Header().Set("Content-Type", "application/json")

		namespace := r.URL.Query().Get("namespace")
		if namespace != "" && !portfolioNamespaces[namespace] {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Unknown or disallowed namespace"})
			return
		}

		metrics, err := fetchPrometheusMetrics(r.Context(), namespace)
		if err != nil {
			log.Printf("[proxy] Error fetching metrics: %v", err)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Failed to fetch metrics"})
			return
		}
		writeJSON(w, http.StatusOK, metrics)
	})

	mux.HandleFunc("/api/pods/", handlePodDetail(clientset))

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "ok")
	})

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,  // Slowloris attack protection
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,          // 1 MB max header
	}

	log.Fatal(server.ListenAndServe())
}

func handlePodDetail(clientset *kubernetes.Clientset) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}
		setCORS(w, r)
		setSecurityHeaders(w)
		w.Header().Set("Content-Type", "application/json")

		// Path: /api/pods/{namespace}/{name}
		path := strings.TrimPrefix(r.URL.Path, "/api/pods/")
		parts := strings.Split(path, "/")
		if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Expected path /api/pods/{namespace}/{name}"})
			return
		}

		namespace, name := parts[0], parts[1]
		if len(namespace) > 63 || len(name) > 253 || !portfolioNamespaces[namespace] {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "Pod not found"})
			return
		}

		detail, err := fetchPodDetail(r.Context(), clientset, namespace, name)
		if err != nil {
			log.Printf("[proxy] Error fetching pod %s/%s: %v", namespace, name, err)
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "Pod not found"})
			return
		}

		writeJSON(w, http.StatusOK, detail)
	}
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

func fetchTopology(ctx context.Context, clientset *kubernetes.Clientset) (*TopologyResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	clusterVersion := "unknown"
	if version, err := clientset.Discovery().ServerVersion(); err == nil {
		clusterVersion = version.GitVersion
	}

	nodeList, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("listing nodes: %w", err)
	}

	podList, err := clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("listing pods: %w", err)
	}

	podCountByNode := make(map[string]int)
	for _, pod := range podList.Items {
		if pod.Spec.NodeName != "" {
			podCountByNode[pod.Spec.NodeName]++
		}
	}

	nodes := make([]NodeInfo, 0, len(nodeList.Items))
	for _, node := range nodeList.Items {
		status := "NotReady"
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeReady && condition.Status == corev1.ConditionTrue {
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

	pods := make([]PodInfo, 0)
	for _, pod := range podList.Items {
		if !portfolioNamespaces[pod.Namespace] {
			continue
		}
		pods = append(pods, transformPod(&pod, false))
	}

	return &TopologyResponse{
		ClusterName:    "portfolio-cluster",
		ClusterVersion: clusterVersion,
		Nodes:          nodes,
		Pods:           pods,
		FetchedAt:      time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func fetchPodDetail(ctx context.Context, clientset *kubernetes.Clientset, namespace, name string) (*PodDetailResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	pod, err := clientset.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	eventList, err := clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s,involvedObject.kind=Pod", name),
	})
	if err != nil {
		return nil, fmt.Errorf("listing events: %w", err)
	}

	events := transformEvents(eventList.Items, 20)
	info := transformPod(pod, true)

	return &PodDetailResponse{
		PodInfo: info,
		Events:  events,
	}, nil
}

func fetchEvents(ctx context.Context, clientset *kubernetes.Clientset, namespace string, limit int) ([]EventInfo, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	var allEvents []corev1.Event

	if namespace != "" {
		eventList, err := clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{})
		if err != nil {
			return nil, err
		}
		allEvents = eventList.Items
	} else {
		for ns := range portfolioNamespaces {
			eventList, err := clientset.CoreV1().Events(ns).List(ctx, metav1.ListOptions{})
			if err != nil {
				return nil, err
			}
			allEvents = append(allEvents, eventList.Items...)
		}
	}

	filtered := make([]corev1.Event, 0, len(allEvents))
	for _, event := range allEvents {
		if event.InvolvedObject.Kind == "Pod" && portfolioNamespaces[event.Namespace] {
			filtered = append(filtered, event)
		}
	}

	return transformEvents(filtered, limit), nil
}

func queryPrometheus(ctx context.Context, query string) (string, error) {
	promURL := "http://prometheus.monitoring.svc.cluster.local:9090/api/v1/query"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, promURL, nil)
	if err != nil {
		return "", err
	}
	q := req.URL.Query()
	q.Add("query", query)
	req.URL.RawQuery = q.Encode()

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("prometheus returned status %d", resp.StatusCode)
	}

	var res PromQueryResult
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	if res.Status != "success" || len(res.Data.Result) == 0 || len(res.Data.Result[0].Value) < 2 {
		return "0", nil
	}

	val, ok := res.Data.Result[0].Value[1].(string)
	if !ok {
		return "0", nil
	}
	return val, nil
}

func fetchPrometheusMetrics(ctx context.Context, namespace string) (*MetricsResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	nsFilter := ""
	if namespace != "" {
		nsFilter = fmt.Sprintf(`,namespace="%s"`, namespace)
	}

	podsQuery := fmt.Sprintf(`sum(kube_pod_status_phase{phase="Running"%s})`, nsFilter)
	cpuQuery := fmt.Sprintf(`sum(kube_pod_container_resource_requests{resource="cpu"%s})`, nsFilter)
	memQuery := fmt.Sprintf(`sum(kube_pod_container_resource_requests{resource="memory"%s})`, nsFilter)

	pods, err := queryPrometheus(ctx, podsQuery)
	if err != nil {
		log.Printf("[proxy] failed to query pods: %v", err)
		pods = "0"
	}
	
	cpu, err := queryPrometheus(ctx, cpuQuery)
	if err != nil {
		log.Printf("[proxy] failed to query cpu: %v", err)
		cpu = "0"
	}

	mem, err := queryPrometheus(ctx, memQuery)
	if err != nil {
		log.Printf("[proxy] failed to query memory: %v", err)
		mem = "0"
	}

	return &MetricsResponse{
		TotalPods:           pods,
		TotalCpuRequests:    cpu,
		TotalMemoryRequests: mem,
		FetchedAt:           time.Now().UTC().Format(time.RFC3339),
	}, nil
}

// ── Transform helpers ─────────────────────────────────────────────────────────

func transformPod(pod *corev1.Pod, detailed bool) PodInfo {
	status := podStatus(pod)
	ready, restarts := podReadySummary(pod)
	containers := transformContainers(pod, detailed)
	startedAt := podStartedAt(pod)

	info := PodInfo{
		Name:       pod.Name,
		Namespace:  pod.Namespace,
		Node:       pod.Spec.NodeName,
		Status:     status,
		Labels:     pod.Labels,
		Ready:      ready,
		Restarts:   restarts,
		Age:        formatAge(time.Since(pod.CreationTimestamp.Time)),
		StartedAt:  startedAt,
		Containers: containers,
	}

	if detailed {
		info.ResourceRequests = aggregateResources(pod.Spec.Containers, func(c corev1.Container) corev1.ResourceList {
			return c.Resources.Requests
		})
		info.ResourceLimits = aggregateResources(pod.Spec.Containers, func(c corev1.Container) corev1.ResourceList {
			return c.Resources.Limits
		})
	}

	return info
}

func transformContainers(pod *corev1.Pod, includeImage bool) []ContainerInfo {
	statusByName := make(map[string]corev1.ContainerStatus)
	for _, cs := range pod.Status.ContainerStatuses {
		statusByName[cs.Name] = cs
	}

	containers := make([]ContainerInfo, 0, len(pod.Spec.Containers))
	for _, spec := range pod.Spec.Containers {
		ci := ContainerInfo{Name: spec.Name}
		if includeImage {
			ci.Image = spec.Image
		}

		if cs, ok := statusByName[spec.Name]; ok {
			ci.Ready = cs.Ready
			ci.Restarts = cs.RestartCount
			ci.State, ci.StateReason = containerState(cs)
		} else {
			ci.State = "Unknown"
		}

		containers = append(containers, ci)
	}

	return containers
}

func transformEvents(events []corev1.Event, limit int) []EventInfo {
	sort.Slice(events, func(i, j int) bool {
		return events[i].LastTimestamp.After(events[j].LastTimestamp.Time)
	})

	if len(events) > limit {
		events = events[:limit]
	}

	result := make([]EventInfo, 0, len(events))
	for _, event := range events {
		lastSeen := event.LastTimestamp.Time
		if lastSeen.IsZero() {
			lastSeen = event.EventTime.Time
		}
		if lastSeen.IsZero() {
			lastSeen = event.CreationTimestamp.Time
		}

		result = append(result, EventInfo{
			Type:      event.Type,
			Reason:    event.Reason,
			Message:   event.Message,
			Object:    fmt.Sprintf("%s/%s", event.InvolvedObject.Kind, event.InvolvedObject.Name),
			Namespace: event.Namespace,
			Count:     event.Count,
			Age:       formatAge(time.Since(lastSeen)),
			LastSeen:  lastSeen.UTC().Format(time.RFC3339),
		})
	}

	return result
}

func podStatus(pod *corev1.Pod) string {
	status := string(pod.Status.Phase)
	for _, cs := range pod.Status.ContainerStatuses {
		if cs.State.Waiting != nil && cs.State.Waiting.Reason != "" {
			return cs.State.Waiting.Reason
		}
	}
	return status
}

func podReadySummary(pod *corev1.Pod) (string, int32) {
	total := len(pod.Spec.Containers)
	if total == 0 {
		total = len(pod.Status.ContainerStatuses)
	}

	readyCount := 0
	var restarts int32
	for _, cs := range pod.Status.ContainerStatuses {
		if cs.Ready {
			readyCount++
		}
		restarts += cs.RestartCount
	}

	return fmt.Sprintf("%d/%d", readyCount, max(total, len(pod.Status.ContainerStatuses))), restarts
}

func podStartedAt(pod *corev1.Pod) string {
	var earliest *time.Time

	for _, cs := range pod.Status.ContainerStatuses {
		if cs.State.Running != nil {
			t := cs.State.Running.StartedAt.Time
			if !t.IsZero() && (earliest == nil || t.Before(*earliest)) {
				earliest = &t
			}
		}
	}

	if earliest != nil {
		return earliest.UTC().Format(time.RFC3339)
	}
	if !pod.CreationTimestamp.IsZero() {
		return pod.CreationTimestamp.UTC().Format(time.RFC3339)
	}
	return ""
}

func containerState(cs corev1.ContainerStatus) (string, string) {
	switch {
	case cs.State.Running != nil:
		return "Running", ""
	case cs.State.Waiting != nil:
		reason := cs.State.Waiting.Reason
		if reason == "" {
			reason = "Waiting"
		}
		return reason, reason
	case cs.State.Terminated != nil:
		reason := cs.State.Terminated.Reason
		if reason == "" {
			reason = "Terminated"
		}
		return reason, reason
	default:
		return "Unknown", ""
	}
}

func aggregateResources(containers []corev1.Container, getList func(corev1.Container) corev1.ResourceList) *ResourceSummary {
	cpu := resource.NewQuantity(0, resource.DecimalSI)
	mem := resource.NewQuantity(0, resource.BinarySI)
	hasCPU, hasMem := false, false

	for _, container := range containers {
		list := getList(container)
		if q, ok := list[corev1.ResourceCPU]; ok {
			cpu.Add(q)
			hasCPU = true
		}
		if q, ok := list[corev1.ResourceMemory]; ok {
			mem.Add(q)
			hasMem = true
		}
	}

	if !hasCPU && !hasMem {
		return nil
	}

	summary := &ResourceSummary{}
	if hasCPU {
		summary.CPU = cpu.String()
	}
	if hasMem {
		summary.Memory = mem.String()
	}
	return summary
}

func formatAge(d time.Duration) string {
	if d < 0 {
		d = 0
	}

	switch {
	case d < time.Minute:
		return fmt.Sprintf("%ds", int(d.Seconds()))
	case d < time.Hour:
		return fmt.Sprintf("%dm", int(d.Minutes()))
	case d < 24*time.Hour:
		return fmt.Sprintf("%dh%dm", int(d.Hours()), int(d.Minutes())%60)
	default:
		days := int(d.Hours()) / 24
		hours := int(d.Hours()) % 24
		if hours == 0 {
			return fmt.Sprintf("%dd", days)
		}
		return fmt.Sprintf("%dd%dh", days, hours)
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

func setSecurityHeaders(w http.ResponseWriter) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
}

func setCORS(w http.ResponseWriter, r *http.Request) {
	allowedOrigin := os.Getenv("CORS_ALLOWED_ORIGINS")
	origin := r.Header.Get("Origin")
	if allowedOrigin != "" && origin != "" {
		for _, o := range strings.Split(allowedOrigin, ",") {
			if strings.TrimSpace(o) == origin || strings.TrimSpace(o) == "*" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}
	} else {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	}
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

func allowMethod(w http.ResponseWriter, r *http.Request, method string) bool {
	setCORS(w, r)
	setSecurityHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return false
	}
	if r.Method != method {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("[proxy] Error encoding response: %v", err)
	}
}
