(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- Chart: Revenue Model Pie ---
  var chartPie = echarts.init(document.getElementById('chart-revenue'), null, { renderer: 'svg' });
  chartPie.setOption({
    animation: false,
    tooltip: { trigger: 'item', appendToBody: true, formatter: '{b}: {d}%' },
    legend: { bottom: 0, textStyle: { color: ink, fontSize: 13 } },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: bg2, borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%', color: ink, fontSize: 13, fontWeight: 600 },
      labelLine: { lineStyle: { color: rule } },
      data: [
        { value: 60, name: '商城佣金', itemStyle: { color: accent } },
        { value: 20, name: '模板付费', itemStyle: { color: accent2 } },
        { value: 10, name: '广告收入', itemStyle: { color: muted } },
        { value: 10, name: 'VIP 会员', itemStyle: { color: rule } }
      ]
    }]
  });
  window.addEventListener('resize', function() { chartPie.resize(); });

  // --- Chart: Growth Targets Bar ---
  var chartBar = echarts.init(document.getElementById('chart-growth'), null, { renderer: 'svg' });
  chartBar.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true, axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['第1月', '第3月', '第6月', '第9月', '第12月', '第18月', '第24月'],
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: ink, fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      name: '用户量（千人）',
      nameTextStyle: { color: muted },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: rule, type: 'dashed' } },
      axisLabel: { color: muted }
    },
    series: [{
      name: '目标用户数',
      type: 'bar',
      barWidth: '50%',
      itemStyle: { color: accent, borderRadius: [4, 4, 0, 0] },
      data: [2, 5, 15, 30, 50, 80, 120]
    }]
  });
  window.addEventListener('resize', function() { chartBar.resize(); });
})();
