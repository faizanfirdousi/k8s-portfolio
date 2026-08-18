---
title: "Building a Container From Scratch in Go"
date: "2025-02-18"
excerpt: "How Docker and container runtimes actually isolate processes using Linux namespaces, chroot, and cgroup v2 — built in Go."
tags: ["go", "linux", "containers", "systems"]
---

# Building a Container From Scratch in Go

Containers are often thought of as lightweight virtual machines, but under the hood, a container is just a regular Linux process with special isolation flags and resource boundaries applied by the Linux kernel.

To understand how container runtimes like Docker and containerd actually work under the hood, I built a small container runtime from scratch in Go.

## 1. What Makes a Container?

At the kernel level, container isolation relies on three fundamental mechanisms:

1. **Linux Namespaces:** Control what a process can **see** (Process IDs, Mount points, Network interfaces, IPC, Hostnames).
2. **chroot / pivot_root:** Isolates what files and filesystem tree the process has access to.
3. **cgroups (Control Groups v2):** Controls how much a process can **use** (CPU bandwidth, Memory limits, maximum PIDs).

## 2. Process Isolation with Namespaces

In Go, we can invoke the `clone` syscall with namespace flags using the `syscall.SysProcAttr` struct:

```go
cmd := exec.Command("/proc/self/exe", append([]string{"child"}, os.Args[2:]...)...)
cmd.Stdin = os.Stdin
cmd.Stdout = os.Stdout
cmd.Stderr = os.Stderr

cmd.SysProcAttr = &syscall.SysProcAttr{
    Cloneflags: syscall.CLONE_NEWUTS | // New hostname namespace
               syscall.CLONE_NEWPID | // New PID namespace
               syscall.CLONE_NEWNS  | // New Mount namespace
               syscall.CLONE_NEWIPC,  // New IPC namespace
}

must(cmd.Run())
```

When this runs, the child process spawned receives PID 1 in its own isolated PID namespace.

## 3. Isolating the Filesystem with chroot

Next, we restrict the process to its own root filesystem (like an extracted Alpine Linux rootfs) so it cannot view or modify the host filesystem:

```go
func child() {
    // Set a custom hostname inside the container
    must(syscall.Sethostname([]byte("container-box")))
    
    // Change root to the target rootfs directory
    must(syscall.Chroot("/path/to/rootfs"))
    must(os.Chdir("/"))
    
    // Mount a private /proc so ps and top inspect only container processes
    must(syscall.Mount("proc", "/proc", "proc", 0, ""))
    
    cmd := exec.Command(os.Args[2], os.Args[3:]...)
    cmd.Stdin = os.Stdin
    cmd.Stdout = os.Stdout
    cmd.Stderr = os.Stderr
    
    must(cmd.Run())
    
    // Cleanup
    must(syscall.Unmount("/proc", 0))
}
```

## 4. Enforcing Resource Limits with cgroups v2

Without resource controls, a single runaway process could starve the entire host. In Linux cgroups v2, limits are configured by writing directly to pseudo-files in `/sys/fs/cgroup/`:

```go
func applyCgroupLimits(cgroupName string, maxPids int, memoryMaxBytes int) {
    cgroupPath := filepath.Join("/sys/fs/cgroup", cgroupName)
    must(os.MkdirAll(cgroupPath, 0755))
    
    // Limit max processes
    must(os.WriteFile(filepath.Join(cgroupPath, "pids.max"), []byte(strconv.Itoa(maxPids)), 0700))
    
    // Limit max memory
    must(os.WriteFile(filepath.Join(cgroupPath, "memory.max"), []byte(strconv.Itoa(memoryMaxBytes)), 0700))
    
    // Add our current PID to this cgroup
    must(os.WriteFile(filepath.Join(cgroupPath, "cgroup.procs"), []byte(strconv.Itoa(os.Getpid())), 0700))
}
```

## Key Takeaway

Building tools from first principles demystifies higher-level orchestration tools like Kubernetes and Docker. When you understand that a container is just a combination of Linux namespaces, chroot, and cgroups, debugging cloud workloads becomes much more intuitive.
