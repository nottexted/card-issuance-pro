import React from "react";
import { Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { toDateInputValue } from "../utils/dates";

export type DateRange = { from: string; to: string };

export default function DateRangeControls({
  value,
  onChange,
  presets = [7, 30, 90],
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
  presets?: number[];
}) {
  const [draft, setDraft] = React.useState<DateRange>(value);

  React.useEffect(() => setDraft(value), [value.from, value.to]);

  const invalid = !draft.from || !draft.to || draft.from > draft.to;

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      {presets.map((days) => (
        <Chip
          key={days}
          size="small"
          label={`${days}д`}
          onClick={() => {
            const d = new Date();
            const f = new Date();
            f.setDate(d.getDate() - days);
            const next = { from: toDateInputValue(f), to: toDateInputValue(d) };
            setDraft(next);
            onChange(next);
          }}
        />
      ))}
      <TextField
        type="date"
        size="small"
        value={draft.from}
        onChange={(e) => setDraft({ ...draft, from: e.target.value })}
        sx={{ width: 150 }}
      />
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
      <TextField
        type="date"
        size="small"
        value={draft.to}
        onChange={(e) => setDraft({ ...draft, to: e.target.value })}
        sx={{ width: 150 }}
      />
      <Button size="small" variant="outlined" onClick={() => onChange(draft)} disabled={invalid}>
        Применить
      </Button>
    </Stack>
  );
}
