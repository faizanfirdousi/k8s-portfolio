    const toggleBtn = document.getElementById('theme-toggle-btn');
    const root = document.documentElement;
    const currentTheme = localStorage.getItem('portfolio-theme');
    if (currentTheme === 'dark') { root.classList.add('dark'); }
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        root.classList.toggle('dark');
        const isDark = root.classList.contains('dark');
        localStorage.setItem('portfolio-theme', isDark ? 'dark' : 'light');
      });
    }
    window.addEventListener('storage', (e) => {
      if (e.key === 'portfolio-theme') {
        if (e.newValue === 'dark') { root.classList.add('dark'); }
        else { root.classList.remove('dark'); }
      }
    });

    (function () {
      const panel = document.querySelector('.metrics-panel[data-namespace]');
      if (!panel) return;

      const updateMetrics = async () => {
        try {
          const response = await fetch('/api/topology');
          if (!response.ok) return;
          const topology = await response.json();
          const pod = topology.pods?.find((item) => item.namespace === panel.dataset.namespace);
          if (!pod) return;

          panel.querySelector('[data-live="pod-name"]').textContent = pod.name;
          const status = panel.querySelector('[data-live="pod-status"]');
          status.textContent = pod.status;
          status.className = `value ${pod.status === 'Running' ? 'accent' : ''}`;

          panel.querySelectorAll('.metric-slot').forEach((slot) => {
            const label = slot.querySelector('.metric-slot__label')?.textContent.trim().toLowerCase();
            const value = slot.querySelector('.metric-slot__value');
            if (!value) return;
            if (label === 'restarts') value.textContent = pod.restarts;
            if (label === 'uptime') value.textContent = pod.age || '—';
          });
        } catch (_) {}

        try {
          const res = await fetch('/api/metrics?namespace=' + panel.dataset.namespace);
          if (!res.ok) return;
          const data = await res.json();
          panel.querySelectorAll('.metric-slot').forEach((slot) => {
            const label = slot.querySelector('.metric-slot__label')?.textContent.trim().toLowerCase();
            const value = slot.querySelector('.metric-slot__value');
            if (!value) return;
            if (label === 'cpu') {
              const cpuVal = parseFloat(data.totalCpuRequests);
              value.textContent = !isNaN(cpuVal) ? (cpuVal < 1 ? Math.round(cpuVal * 1000) + 'm' : cpuVal.toFixed(2)) : '0m';
            }
            if (label === 'memory') {
              const memVal = parseFloat(data.totalMemoryRequests) / (1024 * 1024);
              value.textContent = !isNaN(memVal) ? Math.round(memVal) + ' MB' : '0 MB';
            }
          });
        } catch (_) {}
      };

      updateMetrics();
      window.setInterval(updateMetrics, 10000);
    })();
