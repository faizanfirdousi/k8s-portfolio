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

type NodeResources struct {
	CPUCapacity       string `json:"cpuCapacity,omitempty"`
	MemoryCapacity    string `json:"memoryCapacity,omitempty"`
	CPUAllocatable    string `json:"cpuAllocatable,omitempty"`
	MemoryAllocatable string `json:"memoryAllocatable,omitempty"`
	MaxPods           string `json:"maxPods,omitempty"`
}

type NodeInfo struct {
	Name             string         `json:"name"`
	Status           string         `json:"status"`
	PodCount         int            `json:"podCount"`
	Roles            []string       `json:"roles,omitempty"`
	KubeletVersion   string         `json:"kubeletVersion,omitempty"`
	OSImage          string         `json:"osImage,omitempty"`
	Architecture     string         `json:"architecture,omitempty"`
	ContainerRuntime string         `json:"containerRuntime,omitempty"`
	Resources        *NodeResources `json:"resources,omitempty"`
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
	Namespace           string `json:"namespace,omitempty"`
	TotalPods           string `json:"totalPods"`
	RunningPods         string `json:"runningPods,omitempty"`
	TotalCpuRequests    string `json:"totalCpuRequests"`
	TotalMemoryRequests string `json:"totalMemoryRequests"`
	TotalCpuLimits      string `json:"totalCpuLimits,omitempty"`
	TotalMemoryLimits   string `json:"totalMemoryLimits,omitempty"`
	// cAdvisor actual usage (only when ?type=usage)
	TotalCpuUsage    string `json:"totalCpuUsage,omitempty"`
	TotalMemoryUsage string `json:"totalMemoryUsage,omitempty"`
	// Traefik request rate (only when Traefik scrape is active)
	RequestsPerSecond string `json:"requestsPerSecond,omitempty"`
	P99LatencyMs      string `json:"p99LatencyMs,omitempty"`
	NodeCount         int    `json:"nodeCount,omitempty"`
	FetchedAt         string `json:"fetchedAt"`
}

// PodMetricsResponse is returned by GET /api/pods/:ns/:name/metrics
type PodMetricsResponse struct {
	Namespace       string `json:"namespace"`
	PodName         string `json:"podName"`
	CpuUsageCores   string `json:"cpuUsageCores"`
	MemoryUsageBytes string `json:"memoryUsageBytes"`
	FetchedAt       string `json:"fetchedAt"`
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

		metrics, err := fetchPrometheusMetrics(r.Context(), clientset, namespace)
		if err != nil {
			log.Printf("[proxy] Error fetching metrics: %v", err)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Failed to fetch metrics"})
			return
		}
		writeJSON(w, http.StatusOK, metrics)
	})

	mux.HandleFunc("/api/pods/", handlePodOrMetrics(clientset))

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

// handlePodOrMetrics dispatches:
//   /api/pods/{namespace}/{name}         → pod detail + events
//   /api/pods/{namespace}/{name}/metrics → cAdvisor live CPU/mem for that pod
func handlePodOrMetrics(clientset *kubernetes.Clientset) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}
		setCORS(w, r)
		setSecurityHeaders(w)
		w.Header().Set("Content-Type", "application/json")

		// Strip prefix and parse segments
		path := strings.TrimPrefix(r.URL.Path, "/api/pods/")
		parts := strings.Split(strings.TrimSuffix(path, "/"), "/")

		// /api/pods/{ns}/{name}/metrics
		if len(parts) == 3 && parts[2] == "metrics" {
			ns, name := parts[0], parts[1]
			podMetrics, err := fetchPodCAdvisorMetrics(r.Context(), ns, name)
			if err != nil {
				log.Printf("[proxy] Error fetching cAdvisor metrics for %s/%s: %v", ns, name, err)
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "Failed to fetch pod metrics"})
				return
			}
			writeJSON(w, http.StatusOK, podMetrics)
			return
		}

		// /api/pods/{ns}/{name}
		if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "Expected path /api/pods/{namespace}/{name}"})
			return
		}

		namespace, name := parts[0], parts[1]
		if len(namespace) > 63 || len(name) > 253 {
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

		var roles []string
		for label := range node.Labels {
			if strings.HasPrefix(label, "node-role.kubernetes.io/") {
				roles = append(roles, strings.TrimPrefix(label, "node-role.kubernetes.io/"))
			}
		}
		if len(roles) == 0 {
			roles = []string{"worker"}
		}

		memCap := node.Status.Capacity.Memory()
		memAlloc := node.Status.Allocatable.Memory()

		res := &NodeResources{
			CPUCapacity:       node.Status.Capacity.Cpu().String(),
			MemoryCapacity:    fmt.Sprintf("%d MB", memCap.Value()/(1024*1024)),
			CPUAllocatable:    node.Status.Allocatable.Cpu().String(),
			MemoryAllocatable: fmt.Sprintf("%d MB", memAlloc.Value()/(1024*1024)),
			MaxPods:           node.Status.Capacity.Pods().String(),
		}

		nodes = append(nodes, NodeInfo{
			Name:             node.Name,
			Status:           status,
			PodCount:         podCountByNode[node.Name],
			Roles:            roles,
			KubeletVersion:   node.Status.NodeInfo.KubeletVersion,
			OSImage:          node.Status.NodeInfo.OSImage,
			Architecture:     node.Status.NodeInfo.Architecture,
			ContainerRuntime: node.Status.NodeInfo.ContainerRuntimeVersion,
			Resources:        res,
		})
	}

	pods := make([]PodInfo, 0)
	for _, pod := range podList.Items {
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
		eventList, err := clientset.CoreV1().Events(metav1.NamespaceAll).List(ctx, metav1.ListOptions{})
		if err != nil {
			return nil, err
		}
		allEvents = eventList.Items
	}

	filtered := make([]corev1.Event, 0, len(allEvents))
	for _, event := range allEvents {
		if event.InvolvedObject.Kind == "Pod" {
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

// fetchPodCAdvisorMetrics queries Prometheus for live cAdvisor CPU/memory for a single pod.
func fetchPodCAdvisorMetrics(ctx context.Context, namespace, podName string) (*PodMetricsResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// cAdvisor metrics use pod label (not pod_name), container!="" excludes pause containers
	cpuQuery := fmt.Sprintf(
		`sum(rate(container_cpu_usage_seconds_total{namespace="%s",pod="%s",container!=""}[2m]))`,
		namespace, podName,
	)
	memQuery := fmt.Sprintf(
		`sum(container_memory_working_set_bytes{namespace="%s",pod="%s",container!=""})`,
		namespace, podName,
	)

	cpu, _ := queryPrometheus(ctx, cpuQuery)
	mem, _ := queryPrometheus(ctx, memQuery)

	return &PodMetricsResponse{
		Namespace:        namespace,
		PodName:          podName,
		CpuUsageCores:    cpu,
		MemoryUsageBytes: mem,
		FetchedAt:        time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func fetchPrometheusMetrics(ctx context.Context, clientset *kubernetes.Clientset, namespace string) (*MetricsResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	nsFilter := ""
	if namespace != "" {
		nsFilter = fmt.Sprintf(`,namespace="%s"`, namespace)
	}

	podsQuery := fmt.Sprintf(`sum(kube_pod_status_phase{phase="Running"%s})`, nsFilter)
	cpuQuery := fmt.Sprintf(`sum(kube_pod_container_resource_requests{resource="cpu"%s})`, nsFilter)
	memQuery := fmt.Sprintf(`sum(kube_pod_container_resource_requests{resource="memory"%s})`, nsFilter)
	cpuLimQuery := fmt.Sprintf(`sum(kube_pod_container_resource_limits{resource="cpu"%s})`, nsFilter)
	memLimQuery := fmt.Sprintf(`sum(kube_pod_container_resource_limits{resource="memory"%s})`, nsFilter)

	// cAdvisor actual usage (aggregated across portfolio namespaces)
	var cpuUsageQuery, memUsageQuery string
	if namespace != "" {
		cpuUsageQuery = fmt.Sprintf(
			`sum(rate(container_cpu_usage_seconds_total{namespace="%s",container!=""}[2m]))`,
			namespace,
		)
		memUsageQuery = fmt.Sprintf(
			`sum(container_memory_working_set_bytes{namespace="%s",container!=""})`,
			namespace,
		)
	} else {
		// Global queries across all namespaces
		cpuUsageQuery = `sum(rate(container_cpu_usage_seconds_total{container!=""}[2m]))`
		memUsageQuery = `sum(container_memory_working_set_bytes{container!=""})`
	}

	// Traefik request rate (safe to fail — no scrape job yet returns 0)
	traefikRpsQuery := `sum(rate(traefik_service_requests_total[1m]))`
	traefikP99Query := `histogram_quantile(0.99, sum(rate(traefik_service_request_duration_seconds_bucket[1m])) by (le)) * 1000`

	pods, err := queryPrometheus(ctx, podsQuery)
	if err != nil || pods == "0" {
		// Fallback to direct Kubernetes API calculation
		podList, listErr := clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
		if listErr == nil {
			var runningCount int
			cpuReq := resource.NewQuantity(0, resource.DecimalSI)
			memReq := resource.NewQuantity(0, resource.BinarySI)
			cpuLim := resource.NewQuantity(0, resource.DecimalSI)
			memLim := resource.NewQuantity(0, resource.BinarySI)

			for _, pod := range podList.Items {
				if pod.Status.Phase == corev1.PodRunning {
					runningCount++
				}
				for _, c := range pod.Spec.Containers {
					if q, ok := c.Resources.Requests[corev1.ResourceCPU]; ok {
						cpuReq.Add(q)
					}
					if q, ok := c.Resources.Requests[corev1.ResourceMemory]; ok {
						memReq.Add(q)
					}
					if q, ok := c.Resources.Limits[corev1.ResourceCPU]; ok {
						cpuLim.Add(q)
					}
					if q, ok := c.Resources.Limits[corev1.ResourceMemory]; ok {
						memLim.Add(q)
					}
				}
			}

			nodeList, _ := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})

			// Still try cAdvisor + Traefik even in K8s-API fallback path
			cpuUsage, _ := queryPrometheus(ctx, cpuUsageQuery)
			memUsage, _ := queryPrometheus(ctx, memUsageQuery)
			rps, _ := queryPrometheus(ctx, traefikRpsQuery)
			p99, _ := queryPrometheus(ctx, traefikP99Query)

			return &MetricsResponse{
				Namespace:           namespace,
				TotalPods:           fmt.Sprintf("%d", runningCount),
				RunningPods:         fmt.Sprintf("%d", runningCount),
				TotalCpuRequests:    fmt.Sprintf("%f", float64(cpuReq.MilliValue())/1000.0),
				TotalMemoryRequests: fmt.Sprintf("%d", memReq.Value()),
				TotalCpuLimits:      fmt.Sprintf("%f", float64(cpuLim.MilliValue())/1000.0),
				TotalMemoryLimits:   fmt.Sprintf("%d", memLim.Value()),
				TotalCpuUsage:       cpuUsage,
				TotalMemoryUsage:    memUsage,
				RequestsPerSecond:   rps,
				P99LatencyMs:        p99,
				NodeCount:           len(nodeList.Items),
				FetchedAt:           time.Now().UTC().Format(time.RFC3339),
			}, nil
		}
	}

	cpu, _ := queryPrometheus(ctx, cpuQuery)
	mem, _ := queryPrometheus(ctx, memQuery)
	cpuLim, _ := queryPrometheus(ctx, cpuLimQuery)
	memLim, _ := queryPrometheus(ctx, memLimQuery)
	cpuUsage, _ := queryPrometheus(ctx, cpuUsageQuery)
	memUsage, _ := queryPrometheus(ctx, memUsageQuery)
	rps, _ := queryPrometheus(ctx, traefikRpsQuery)
	p99, _ := queryPrometheus(ctx, traefikP99Query)

	nodeList, _ := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})

	return &MetricsResponse{
		Namespace:           namespace,
		TotalPods:           pods,
		RunningPods:         pods,
		TotalCpuRequests:    cpu,
		TotalMemoryRequests: mem,
		TotalCpuLimits:      cpuLim,
		TotalMemoryLimits:   memLim,
		TotalCpuUsage:       cpuUsage,
		TotalMemoryUsage:    memUsage,
		RequestsPerSecond:   rps,
		P99LatencyMs:        p99,
		NodeCount:           len(nodeList.Items),
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
	if allowedOrigin == "" || origin == "" {
		return
	}
	for _, o := range strings.Split(allowedOrigin, ",") {
		if strings.TrimSpace(o) == origin || strings.TrimSpace(o) == "*" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			break
		}
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
