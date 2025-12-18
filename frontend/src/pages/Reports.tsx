import React from "react";
import { Box, Card, CardContent, Grid, LinearProgress, Stack, Typography } from "@mui/material";
import PageHeader from "../components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { reportRejectReasons, reportSla, reportVolume } from "../api/queries";
import ReactECharts from "echarts-for-react";
import DateRangeControls, { type DateRange } from "../components/DateRangeControls";
import { fmtDate } from "../utils/format";
import { isoEnd, isoStart, toDateInputValue } from "../utils/dates";

export default function Reports() {
  const today = React.useMemo(() => new Date(), []);
  const defaultFrom = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 180);
    return d;
  }, []);
  const [rangeApplied, setRangeApplied] = React.useState<DateRange>({
    from: toDateInputValue(defaultFrom),
    to: toDateInputValue(today),
  });

  const volQ = useQuery({
    queryKey: ["rep-volume", rangeApplied.from, rangeApplied.to],
    queryFn: () =>
      reportVolume({
        bucket: "month",
        date_from: isoStart(rangeApplied.from),
        date_to: isoEnd(rangeApplied.to),
      }),
  });
  const slaQ = useQuery({
    queryKey: ["rep-sla", rangeApplied.from, rangeApplied.to],
    queryFn: () =>
      reportSla({
        bucket: "month",
        date_from: isoStart(rangeApplied.from),
        date_to: isoEnd(rangeApplied.to),
      }),
  });
  const rejQ = useQuery({
    queryKey: ["rep-reject", rangeApplied.from, rangeApplied.to],
    queryFn: () => reportRejectReasons({ date_from: isoStart(rangeApplied.from), date_to: isoEnd(rangeApplied.to) }),
  });

  const volume = volQ.data?.points ?? [];
  const sla = slaQ.data?.points ?? [];
  const rej = rejQ.data?.points ?? [];
  const rangeLabel = `${fmtDate(rangeApplied.from)} — ${fmtDate(rangeApplied.to)}`;

  const optVolume = {
    tooltip: { trigger: "axis" },
    legend: { data: ["Заявки", "Одобрено", "Выпущено", "Активировано"] },
    grid: { left: 48, right: 16, top: 36, bottom: 40 },
    xAxis: { type: "category", data: volume.map((p) => p.bucket) },
    yAxis: { type: "value" },
    series: [
      { name: "Заявки", type: "bar", data: volume.map((p) => p.applications) },
      { name: "Одобрено", type: "bar", data: volume.map((p) => p.approved) },
      { name: "Выпущено", type: "bar", data: volume.map((p) => p.issued) },
      { name: "Активировано", type: "bar", data: volume.map((p) => p.activated) },
    ],
  };

  const optSla = {
    tooltip: { trigger: "axis" },
    legend: { data: ["До решения", "До выпуска", "Доставка", "До активации"] },
    grid: { left: 48, right: 16, top: 36, bottom: 40 },
    xAxis: { type: "category", data: sla.map((p) => p.bucket) },
    yAxis: { type: "value" },
    series: [
      { name: "До решения", type: "line", smooth: true, data: sla.map((p) => p.days_to_decision_avg) },
      { name: "До выпуска", type: "line", smooth: true, data: sla.map((p) => p.days_to_issue_avg) },
      { name: "Доставка", type: "line", smooth: true, data: sla.map((p) => p.days_delivery_avg) },
      { name: "До активации", type: "line", smooth: true, data: sla.map((p) => p.days_to_activate_avg) },
    ],
  };

  const optRej = {
    tooltip: { trigger: "item" },
    legend: { left: "left" },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 800 } },
        data: rej.map((p) => ({ name: p.reason, value: p.count })),
      },
    ],
  };

  return (
    <Box>
      <PageHeader
        title="Отчеты и аналитика"
        subtitle="Качественные графики: объёмы, SLA по этапам, структура отказов."
        right={<DateRangeControls value={rangeApplied} onChange={setRangeApplied} presets={[30, 90, 180]} />}
      />

      {(volQ.isLoading || slaQ.isLoading || rejQ.isLoading) && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Card elevation={0} sx={{ border: "1px solid #e7eaf3" }}>
            <CardContent>
              <Typography variant="h6">Объемы (по месяцам)</Typography>
              <Typography variant="caption" color="text.secondary">
                Тренды: заявки → одобрение → выпуск → активация • {rangeLabel}
              </Typography>
              <ReactECharts option={optVolume} style={{ height: 360 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card elevation={0} sx={{ border: "1px solid #e7eaf3" }}>
            <CardContent>
              <Typography variant="h6">Причины отказов</Typography>
              <Typography variant="caption" color="text.secondary">
                Структура отказов за период • {rangeLabel}
              </Typography>
              <ReactECharts option={optRej} style={{ height: 360 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: "1px solid #e7eaf3" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="h6">SLA по этапам (в днях)</Typography>
                <Typography variant="caption" color="text.secondary">
                  средние значения по месяцам • {rangeLabel}
                </Typography>
              </Stack>
              <ReactECharts option={optSla} style={{ height: 360 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
