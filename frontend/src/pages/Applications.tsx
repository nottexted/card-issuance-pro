import React from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridToolbarContainer, type GridToolbarProps } from "@mui/x-data-grid";
import { useMutation, useQuery } from "@tanstack/react-query";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import GavelIcon from "@mui/icons-material/Gavel";
import PrintIcon from "@mui/icons-material/Print";
import CreditCardIcon from "@mui/icons-material/CreditCard";

import PageHeader from "../components/PageHeader";
import StatusChip from "../components/StatusChip";
import { useMeta } from "../state/meta";
import { useToast } from "../state/toast";
import { useStaff } from "../state/staff";
import { API_BASE } from "../api/http";
import {
  createApplication,
  decideApplication,
  ensureCard,
  listApplications,
  listClients,
  updateApplication,
} from "../api/queries";
import type { ApplicationRow, Client } from "../api/types";
import { fmtDate, fmtDateTime, money } from "../utils/format";

function passportLast3(doc?: string | null): string {
  if (!doc) return "—";
  const digits = (doc.match(/\d+/g) || []).join("");
  if (!digits) return "—";
  return digits.slice(-3);
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function ClientSelect({
  value,
  initialClient,
  onChange,
}: {
  value: string;
  initialClient?: Client;
  onChange: (id: string, client?: Client | null) => void;
}) {
  const [input, setInput] = React.useState("");
  const debounced = useDebounced(input, 250);

  const q = useQuery({
    queryKey: ["client-options", debounced],
    queryFn: () => listClients(debounced, debounced ? 20 : 200, 0),
  });

  const options = q.data?.items ?? [];
  const selected: Client | null =
    (initialClient && initialClient.id === value ? initialClient : null) || (options.find((c) => c.id === value) ?? null);

  return (
    <Autocomplete
      options={options}
      value={selected}
      loading={q.isLoading}
      onChange={(_, v) => onChange(v?.id || "", v)}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      filterOptions={(x) => x} // серверная фильтрация
      getOptionLabel={(c) => `${c.full_name} • ${passportLast3(c.doc_number)}`}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Клиент"
          placeholder="Начни вводить ФИО или последние 3 цифры паспорта"
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {q.isLoading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, c) => (
        <Box component="li" {...props} key={c.id}>
          <Box>
            <Typography sx={{ fontWeight: 900 }}>{c.full_name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {c.phone || "—"} • паспорт …{passportLast3(c.doc_number)}
            </Typography>
          </Box>
        </Box>
      )}
    />
  );
}

export default function Applications() {
  const toast = useToast();
  const { meta } = useMeta();
  const { staff } = useStaff();

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<string>("");

  const query = useQuery({
    queryKey: ["applications", q, status],
    queryFn: () =>
      listApplications({
        q: q || undefined,
        statuses: status ? [status] : undefined,
        limit: 100,
        offset: 0,
      }),
  });

  const onRefresh = React.useCallback(() => query.refetch(), [query]);
  const Toolbar = React.useCallback((props: GridToolbarProps) => <GridToolbar {...props} onRefresh={onRefresh} />, [onRefresh]);

  const [formDlg, setFormDlg] = React.useState<{ open: boolean; row?: ApplicationRow }>({ open: false });
  const [decisionDlg, setDecisionDlg] = React.useState<{ open: boolean; row?: ApplicationRow }>({ open: false });

  const createMut = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      toast.show("Заявка создана", "success");
      setFormDlg({ open: false });
      query.refetch();
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateApplication(id, payload),
    onSuccess: () => {
      toast.show("Заявка обновлена", "success");
      setFormDlg({ open: false });
      query.refetch();
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const decideMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => decideApplication(id, payload),
    onSuccess: () => {
      toast.show("Решение сохранено", "success");
      setDecisionDlg({ open: false });
      query.refetch();
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const ensureMut = useMutation({
    mutationFn: (id: string) => ensureCard(id),
    onSuccess: (r) => {
      toast.show(`Карта создана: ${r.card_no}`, "success");
      query.refetch();
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const rows = query.data?.items ?? [];

  const openPrint = React.useCallback(
    (appId: string, kind: "statement" | "contract") => {
      if (!staff.name) {
        toast.show("Укажите ФИО сотрудника в верхней панели (демо-авторизация) — нужно для печатных форм.", "warning");
        return;
      }
      const sp = new URLSearchParams();
      sp.set("staff_name", staff.name);
      if (staff.position) sp.set("staff_position", staff.position);
      window.open(`${API_BASE}/api/applications/${appId}/print/${kind}?${sp.toString()}`, "_blank");
    },
    [staff.name, staff.position, toast],
  );

  const columns: GridColDef<ApplicationRow>[] = [
    {
      field: "application_no",
      headerName: "Заявка",
      width: 150,
      renderCell: (p) => <Typography sx={{ fontWeight: 900 }}>{p.row.application_no}</Typography>,
    },
    {
      field: "status",
      headerName: "Статус",
      width: 190,
      sortable: false,
      renderCell: (p) => <StatusChip code={p.row.status?.code || "—"} name={p.row.status?.name || p.row.status?.code} />,
    },
    {
      field: "client",
      headerName: "Клиент",
      width: 260,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ py: 0.25 }}>
          <Typography sx={{ fontWeight: 800 }}>{p.row.client?.full_name || "—"}</Typography>
          <Typography variant="caption" color="text.secondary">
            {(p.row.client?.phone || "—") + " • паспорт …" + passportLast3(p.row.client?.doc_number)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "product",
      headerName: "Продукт",
      width: 240,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ py: 0.25 }}>
          <Typography sx={{ fontWeight: 800 }}>{p.row.product?.name || "—"}</Typography>
          <Typography variant="caption" color="text.secondary">
            {(p.row.product?.payment_system || "—") + " • " + (p.row.product?.level || "—") + " • " + (p.row.product?.currency || "—")}
          </Typography>
        </Box>
      ),
    },
    {
      field: "tariff",
      headerName: "Тариф",
      width: 220,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ py: 0.25 }}>
          <Typography sx={{ fontWeight: 800 }}>{p.row.tariff?.name || "—"}</Typography>
          <Typography variant="caption" color="text.secondary">
            Выпуск {money(p.row.tariff?.issue_fee ?? 0)} • {money(p.row.tariff?.monthly_fee ?? 0)}/мес
          </Typography>
        </Box>
      ),
    },
    {
      field: "branch",
      headerName: "Офис",
      width: 200,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ py: 0.25 }}>
          <Typography sx={{ fontWeight: 800 }}>{p.row.branch?.name || "—"}</Typography>
          <Typography variant="caption" color="text.secondary">
            {p.row.branch?.city || "—"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "requested_at",
      headerName: "Создана",
      width: 170,
      renderCell: (p) => <Typography>{fmtDateTime(p.row.requested_at)}</Typography>,
    },
    {
      field: "planned_issue_date",
      headerName: "План выпуска",
      width: 140,
      renderCell: (p) => <Typography>{fmtDate(p.row.planned_issue_date)}</Typography>,
    },
    {
      field: "actions",
      headerName: "",
      width: 260,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} sx={{ width: "100%", justifyContent: "flex-end" }}>
          <Tooltip title="Редактировать">
            <IconButton size="small" onClick={() => setFormDlg({ open: true, row: p.row })}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Решение (одобрить/отказать)">
            <IconButton size="small" onClick={() => setDecisionDlg({ open: true, row: p.row })}>
              <GavelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Создать карту по заявке">
            <span>
              <IconButton
                onClick={() => ensureMut.mutate(p.row.id)}
                size="small"
                disabled={!["APPROVED", "IN_BATCH"].includes(p.row.status?.code || "")}
              >
                <CreditCardIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Печать заявления (PDF)">
            <IconButton onClick={() => openPrint(p.row.id, "statement")} size="small">
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Печать: Договор‑оферта (PDF)">
            <IconButton onClick={() => openPrint(p.row.id, "contract")} size="small">
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Заявки на выпуск"
        subtitle="Создание, проверка/решение, выпуск и печать документов."
        right={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormDlg({ open: true })}>
            Новая заявка
          </Button>
        }
      />

      <Card elevation={0} sx={{ border: "1px solid #e7eaf3" }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              label="Поиск"
              placeholder="APP-..., ФИО, паспорт"
              sx={{ minWidth: 280 }}
            />
            <TextField select size="small" value={status} onChange={(e) => setStatus(e.target.value)} label="Статус" sx={{ minWidth: 220 }}>
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="NEW">Новые</MenuItem>
              <MenuItem value="IN_REVIEW">На проверке</MenuItem>
              <MenuItem value="APPROVED">Одобрены</MenuItem>
              <MenuItem value="IN_BATCH">В партии</MenuItem>
              <MenuItem value="REJECTED">Отказы</MenuItem>
            </TextField>
            <Box sx={{ flex: 1 }} />
            <Chip label={`Найдено: ${query.data?.meta.total ?? 0}`} sx={{ fontWeight: 800 }} />
          </Stack>

          {query.isLoading ? <LinearProgress sx={{ mb: 1.5 }} /> : null}

          <div style={{ height: 620, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => r.id}
              disableRowSelectionOnClick
              density="comfortable"
              pageSizeOptions={[50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 50, page: 0 } } }}
              getRowHeight={() => "auto"}
              getEstimatedRowHeight={() => 84}
              sx={{
                border: "1px solid #eef1f7",
                borderRadius: 2,
                background: "#fff",
                "& .MuiDataGrid-columnHeaders": { background: "#fafbff" },
                "& .MuiDataGrid-cell": { py: 1.25, alignItems: "center", whiteSpace: "normal", lineHeight: "1.25" },
                "& .MuiDataGrid-row": { maxHeight: "none !important" },
              }}
              slots={{ toolbar: Toolbar }}
            />
          </div>
        </CardContent>
      </Card>

      <ApplicationFormDialog
        open={formDlg.open}
        row={formDlg.row}
        onClose={() => setFormDlg({ open: false })}
        meta={meta}
        busy={createMut.isPending || updateMut.isPending}
        onSubmit={(id, payload) => {
          if (id) updateMut.mutate({ id, payload });
          else createMut.mutate(payload);
        }}
      />

      <DecisionDialog
        open={decisionDlg.open}
        row={decisionDlg.row}
        onClose={() => setDecisionDlg({ open: false })}
        meta={meta}
        busy={decideMut.isPending}
        onSubmit={(id, payload) => decideMut.mutate({ id, payload })}
      />
    </Box>
  );
}

function GridToolbar({ onRefresh }: GridToolbarProps & { onRefresh: () => void }) {
  return (
    <GridToolbarContainer sx={{ justifyContent: "space-between", px: 1, py: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
        Реестр заявок
      </Typography>
      <Button size="small" onClick={onRefresh} variant="outlined">
        Обновить
      </Button>
    </GridToolbarContainer>
  );
}

function ApplicationFormDialog({
  open,
  row,
  onClose,
  meta,
  onSubmit,
  busy,
}: {
  open: boolean;
  row?: ApplicationRow;
  onClose: () => void;
  meta: any;
  onSubmit: (id: string | null, payload: any) => void;
  busy: boolean;
}) {
  const { refs } = meta || { refs: null };

  const [payload, setPayload] = React.useState<any>({
    client_id: "",
    product_id: "",
    tariff_id: "",
    channel_id: "",
    branch_id: "",
    delivery_method_id: "",
    delivery_address: "",
    embossing_name: "",
    priority: "normal",
    consent_personal_data: true,
    consent_marketing: false,
    comment: "",
  });

  React.useEffect(() => {
    if (!open) return;

    if (row) {
      setPayload({
        client_id: row.client?.id || "",
        product_id: String(row.product?.id ?? ""),
        tariff_id: String(row.tariff?.id ?? ""),
        channel_id: String(row.channel?.id ?? ""),
        branch_id: String(row.branch?.id ?? ""),
        delivery_method_id: String(row.delivery?.id ?? ""),
        delivery_address: row.delivery_address || "",
        embossing_name: row.embossing_name || "",
        priority: row.priority || "normal",
        consent_personal_data: true,
        consent_marketing: false,
        comment: row.comment || "",
      });
    } else {
      setPayload({
        client_id: "",
        product_id: "",
        tariff_id: "",
        channel_id: "",
        branch_id: "",
        delivery_method_id: "",
        delivery_address: "",
        embossing_name: "",
        priority: "normal",
        consent_personal_data: true,
        consent_marketing: false,
        comment: "",
      });
    }
  }, [open, row?.id]);

  const disabled =
    !payload.client_id || !payload.product_id || !payload.tariff_id || !payload.channel_id || !payload.branch_id || !payload.delivery_method_id;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>
        {row ? "Редактирование заявки" : "Новая заявка"}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {row ? row.application_no : "Заполните форму. Клиент выбирается из списка (поиск по ФИО/паспорт)."}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={1.5}>
          <ClientSelect
            value={payload.client_id}
            initialClient={row?.client}
            onChange={(id, c) => {
              setPayload({
                ...payload,
                client_id: id,
                embossing_name:
                  payload.embossing_name ||
                  (c ? c.full_name.split(" ").slice(0, 2).join(" ").toUpperCase().slice(0, 22) : payload.embossing_name),
              });
            }}
          />

          <Divider />

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField select label="Продукт" size="small" fullWidth value={payload.product_id} onChange={(e) => setPayload({ ...payload, product_id: e.target.value })}>
              {refs?.products?.map((x: any) => (
                <MenuItem key={x.id} value={String(x.id)}>
                  {x.name} • {x.payment_system}/{x.level}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Тариф" size="small" fullWidth value={payload.tariff_id} onChange={(e) => setPayload({ ...payload, tariff_id: e.target.value })}>
              {refs?.tariffs?.map((x: any) => (
                <MenuItem key={x.id} value={String(x.id)}>
                  {x.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField select label="Канал" size="small" fullWidth value={payload.channel_id} onChange={(e) => setPayload({ ...payload, channel_id: e.target.value })}>
              {refs?.channels?.map((x: any) => (
                <MenuItem key={x.id} value={String(x.id)}>
                  {x.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Офис" size="small" fullWidth value={payload.branch_id} onChange={(e) => setPayload({ ...payload, branch_id: e.target.value })}>
              {refs?.branches?.map((x: any) => (
                <MenuItem key={x.id} value={String(x.id)}>
                  {x.city} • {x.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              select
              label="Доставка"
              size="small"
              fullWidth
              value={payload.delivery_method_id}
              onChange={(e) => setPayload({ ...payload, delivery_method_id: e.target.value })}
            >
              {refs?.delivery_methods?.map((x: any) => (
                <MenuItem key={x.id} value={String(x.id)}>
                  {x.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Адрес доставки"
              size="small"
              fullWidth
              value={payload.delivery_address}
              onChange={(e) => setPayload({ ...payload, delivery_address: e.target.value })}
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField label="Имя на карте (embossing)" size="small" fullWidth value={payload.embossing_name} onChange={(e) => setPayload({ ...payload, embossing_name: e.target.value })} />
            <TextField select label="Приоритет" size="small" fullWidth value={payload.priority} onChange={(e) => setPayload({ ...payload, priority: e.target.value })}>
              <MenuItem value="low">Низкий</MenuItem>
              <MenuItem value="normal">Обычный</MenuItem>
              <MenuItem value="high">Высокий</MenuItem>
            </TextField>
          </Stack>

          <TextField label="Комментарий" size="small" multiline minRows={3} value={payload.comment} onChange={(e) => setPayload({ ...payload, comment: e.target.value })} />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Отмена
        </Button>
        <Button
          onClick={() =>
            onSubmit(row?.id || null, {
              ...payload,
              product_id: Number(payload.product_id),
              tariff_id: Number(payload.tariff_id),
              channel_id: Number(payload.channel_id),
              branch_id: Number(payload.branch_id),
              delivery_method_id: Number(payload.delivery_method_id),
              delivery_address: payload.delivery_address || null,
              embossing_name: payload.embossing_name || null,
              comment: payload.comment || null,
            })
          }
          variant="contained"
          disabled={busy || disabled}
        >
          {busy ? "Сохранение..." : "Сохранить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DecisionDialog({
  open,
  row,
  onClose,
  meta,
  onSubmit,
  busy,
}: {
  open: boolean;
  row?: ApplicationRow;
  onClose: () => void;
  meta: any;
  onSubmit: (id: string, payload: any) => void;
  busy: boolean;
}) {
  const { refs } = meta || { refs: null };
  const { staff } = useStaff();
  const [decision, setDecision] = React.useState<"approve" | "reject">("approve");
  const [plannedIssue, setPlannedIssue] = React.useState<string>("");
  const [kycScore, setKycScore] = React.useState<number | "">("");
  const [kycResult, setKycResult] = React.useState<string>("pass");
  const [kycNotes, setKycNotes] = React.useState<string>("");
  const [rejectReason, setRejectReason] = React.useState<string>("");

  React.useEffect(() => {
    if (!open || !row) return;
    setDecision("approve");
    setPlannedIssue(row.planned_issue_date || "");
    setKycScore((row.kyc_score ?? "") as any);
    setKycResult(row.kyc_result || "pass");
    setKycNotes("");
    setRejectReason("");
  }, [open, row?.id]);

  const disabled = decision === "reject" && !rejectReason;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>
        Решение по заявке
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {row ? `${row.application_no} • ${row.client?.full_name || "—"}` : ""}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField select label="Решение" size="small" fullWidth value={decision} onChange={(e) => setDecision(e.target.value as any)}>
              <MenuItem value="approve">Одобрить</MenuItem>
              <MenuItem value="reject">Отказать</MenuItem>
            </TextField>
            <TextField label="Плановая дата выпуска" size="small" fullWidth value={plannedIssue} onChange={(e) => setPlannedIssue(e.target.value)} placeholder="YYYY-MM-DD" />
          </Stack>

          {decision === "reject" ? (
            <TextField select label="Причина отказа" size="small" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} fullWidth>
              {refs?.reject_reasons?.map((x: any) => (
                <MenuItem key={x.id} value={String(x.id)}>
                  {x.name}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
            KYC / скоринг
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField label="KYC score" size="small" type="number" fullWidth value={kycScore} onChange={(e) => setKycScore(e.target.value === "" ? "" : Number(e.target.value))} />
            <TextField select label="KYC result" size="small" fullWidth value={kycResult} onChange={(e) => setKycResult(e.target.value)}>
              <MenuItem value="pass">pass</MenuItem>
              <MenuItem value="fail">fail</MenuItem>
              <MenuItem value="manual">manual</MenuItem>
            </TextField>
          </Stack>

          <TextField label="Заметки KYC" size="small" multiline minRows={3} value={kycNotes} onChange={(e) => setKycNotes(e.target.value)} />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Отмена
        </Button>
        <Button
          onClick={() =>
            row &&
            onSubmit(row.id, {
              decision,
              planned_issue_date: plannedIssue || null,
              kyc_score: kycScore === "" ? null : Number(kycScore),
              kyc_result: kycResult || null,
              kyc_notes: kycNotes || null,
              reject_reason_id: decision === "reject" ? Number(rejectReason) : null,
              decision_by: staff.name || "Оператор",
            })
          }
          variant="contained"
          disabled={busy || disabled || !row}
        >
          {busy ? "Сохранение..." : "Сохранить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
