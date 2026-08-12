---
title: "RBAC From First Principles: How Kubernetes Access Control Actually Works"
date: "2024-02-20"
excerpt: "RBAC is one of those things that looks complex on the surface but has a clean, logical model underneath. Let's break it down."
tags: ["kubernetes", "rbac", "security"]
---

# RBAC From First Principles

RBAC (Role-Based Access Control) in Kubernetes gets a reputation for being complex.
It's not — it's just three concepts, and once they click, the rest falls into place.

## The Three Concepts

### 1. Who is asking? (Subject)

A **Subject** is anything that makes API requests:
- A human user (you running `kubectl`)
- A `ServiceAccount` (a Pod making API calls from inside the cluster)
- A group of users

### 2. What do they want to do? (Role)

A **Role** (or **ClusterRole**) lists what is allowed:
- Which **resources** (pods, nodes, secrets, configmaps...)
- Which **verbs** (get, list, watch, create, update, delete...)

### 3. Connect them (RoleBinding)

A **RoleBinding** says "Subject X gets the permissions in Role Y."

## A Real Example: This Portfolio

The cluster-read proxy in this portfolio uses the most minimal possible Role:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: topology-reader
rules:
  - apiGroups: [""]       # "" means the core API group (pods, nodes, services...)
    resources: ["pods", "nodes"]
    verbs: ["get", "list", "watch"]
    # Notice what's NOT here:
    #   - No "create", "update", "delete" (no write access)
    #   - No "secrets" (no access to sensitive data)
    #   - No "deployments", "configmaps" (only what we need)
```

This proxy can read pods and nodes. That's it. If someone compromises the proxy
container, they cannot use it to modify the cluster or read secrets.

## Role vs ClusterRole: The Key Distinction

- **Role** — namespace-scoped. Grants access to resources IN a specific namespace.
- **ClusterRole** — cluster-scoped. Grants access to cluster-wide resources (like `nodes`)
  OR to resources across all namespaces.

`nodes` is a cluster-scoped resource — there's no "nodes in namespace X." So even
if you want minimal access, you need a `ClusterRole` for `nodes`.

## Testing Your RBAC

After applying your RBAC, always test it:

```bash
# Test as the ServiceAccount: can it list pods?
kubectl auth can-i list pods \
  --as=system:serviceaccount:proxy:topology-reader

# Test as the ServiceAccount: can it delete pods? (Should be NO)
kubectl auth can-i delete pods \
  --as=system:serviceaccount:proxy:topology-reader

# Test as the ServiceAccount: can it access secrets? (Should be NO)
kubectl auth can-i get secrets \
  --as=system:serviceaccount:proxy:topology-reader
```

Always test what you CANNOT do, not just what you can. A Role that grants too much
is a security vulnerability, not just a policy violation.

## The Principle of Least Privilege

The rule: **grant the minimum access needed to do the job, and nothing more.**

In practice, this means:
1. Start with no permissions
2. Add only what the service needs to function
3. Test that everything else is denied
4. Document why each permission exists

This is the mindset that separates platform engineering from just "getting it to work."
