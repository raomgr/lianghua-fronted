<script setup>
defineProps({
  stocks: { type: Array, default: () => [] },
  selectedSymbol: { type: String, default: "" },
});

defineEmits(["select"]);
</script>

<template>
  <section class="panel table-panel section-panel">
    <div class="table-header">
      <div class="section-title">股票池快照</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>代码</th>
          <th>名称</th>
          <th>现价</th>
          <th>涨跌幅</th>
          <th>20日动量</th>
          <th>20日波动</th>
          <th>评分</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in stocks"
          :key="row.symbol"
          class="clickable-row"
          :class="{ selected: row.symbol === selectedSymbol }"
          @click="$emit('select', row.symbol)"
        >
          <td>{{ row.symbol }}</td>
          <td>{{ row.name }}</td>
          <td>{{ row.latest_price.toFixed(2) }}</td>
          <td :class="row.pct_change >= 0 ? 'positive' : 'negative'">{{ row.pct_change.toFixed(2) }}%</td>
          <td>{{ ((row.momentum_20 ?? 0) * 100).toFixed(2) }}%</td>
          <td>{{ ((row.volatility_20 ?? 0) * 100).toFixed(2) }}%</td>
          <td>{{ (row.score ?? 0).toFixed(3) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
