(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- Chart: Funnel ---
  var chartFunnel = echarts.init(document.getElementById('chart-funnel'), null, { renderer: 'svg' });
  chartFunnel.setOption({
    animation: false,
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      backgroundColor: bg2,
      borderColor: rule,
      textStyle: { color: ink },
      formatter: function(p) {
        return p.name + '<br/><span style="color:' + accent + ';font-weight:700">' + p.value + '%</span> 转化率';
      }
    },
    series: [{
      type: 'funnel',
      left: '10%',
      top: 20,
      bottom: 20,
      width: '80%',
      min: 0,
      max: 100,
      minSize: '10%',
      maxSize: '100%',
      sort: 'descending',
      gap: 2,
      label: {
        show: true,
        position: 'inside',
        fontSize: 13,
        fontWeight: 600,
        color: '#0f172a',
        formatter: function(p) {
          return p.name + '\n' + p.value + '%';
        }
      },
      labelLine: { show: false },
      itemStyle: {
        borderColor: bg2,
        borderWidth: 2
      },
      emphasis: {
        label: { fontSize: 15 }
      },
      data: [
        { value: 100, name: '进入首页', itemStyle: { color: accent } },
        { value: 45, name: '浏览模板', itemStyle: { color: '#f59e0baa' } },
        { value: 15, name: '进入编辑器', itemStyle: { color: '#ec4899aa' } },
        { value: 8, name: '预览完成', itemStyle: { color: '#8b5cf6aa' } },
        { value: 5, name: '付费转化', itemStyle: { color: '#22c55eaa' } }
      ]
    }]
  });
  window.addEventListener('resize', function() { chartFunnel.resize(); });
})();
