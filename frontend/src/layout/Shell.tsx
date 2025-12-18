import React, { PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Drawer,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  TextField,
  Typography,
  Tooltip,
  Divider,
  Chip,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleIcon from "@mui/icons-material/People";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import SettingsIcon from "@mui/icons-material/Settings";
import InsightsIcon from "@mui/icons-material/Insights";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useStaff } from "../state/staff";

const drawerWidth = 280;
const collapsedWidth = 76;
const LS_KEY = "cis.nav.open";

const nav = [
  { to: "/dashboard", label: "Дашборд", icon: <DashboardIcon /> },
  { to: "/applications", label: "Заявки", icon: <AssignmentIcon /> },
  { to: "/clients", label: "Клиенты", icon: <PeopleIcon /> },
  { to: "/batches", label: "Партии эмиссии", icon: <LocalShippingIcon /> },
  { to: "/cards", label: "Карты", icon: <CreditCardIcon /> },
  { to: "/directories", label: "Справочники", icon: <SettingsIcon /> },
  { to: "/reports", label: "Отчеты", icon: <InsightsIcon /> },
];

function readNavOpen(): boolean {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

export default function Shell({ children }: PropsWithChildren) {
  const location = useLocation();
  const [open, setOpen] = React.useState<boolean>(() => readNavOpen());
  const { staff, setStaff, clearStaff } = useStaff();
  const [staffDlg, setStaffDlg] = React.useState(false);
  const [staffName, setStaffName] = React.useState(staff.name || "");
  const [staffPos, setStaffPos] = React.useState(staff.position || "");

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open]);

  React.useEffect(() => {
    if (!staff.name) setStaffDlg(true);
  }, [staff.name]);

  React.useEffect(() => {
    setStaffName(staff.name || "");
    setStaffPos(staff.position || "");
  }, [staff.name, staff.position]);

  const drawerW = open ? drawerWidth : collapsedWidth;

  const staffMissing = !staff.name || !staff.name.trim();

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" elevation={0} sx={{ borderBottom: "1px solid #e7eaf3", background: "#fff", color: "#111" }}>
        <Toolbar>
          <Tooltip title={open ? "Свернуть меню" : "Развернуть меню"}>
            <IconButton onClick={() => setOpen((v) => !v)} edge="start" sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          </Tooltip>

          <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
            Эмиссия дебетовых карт
          </Typography>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Указать ФИО сотрудника (локально в браузере)">
            <Chip
              size="small"
              clickable
              onClick={() => setStaffDlg(true)}
              color={staffMissing ? "warning" : "default"}
              variant={staffMissing ? "filled" : "outlined"}
              label={staffMissing ? "Сотрудник: не задан" : `Сотрудник: ${staff.name}`}
              sx={{ mr: 1 }}
            />
          </Tooltip>
          <Typography variant="caption" sx={{ color: "#6b7280" }}>
            {new Date().toLocaleString()}
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerW,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerW,
            boxSizing: "border-box",
            borderRight: "1px solid #e7eaf3",
            background: "#ffffff",
            overflowX: "hidden",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-end' : 'center' }}>
          <Tooltip title={open ? 'Свернуть меню' : 'Развернуть меню'}>
            <IconButton size="small" onClick={() => setOpen((v) => !v)}>
              {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ px: 1, py: 1 }}>
          {open ? (
            <Typography variant="caption" sx={{ px: 2, color: "#6b7280" }}>
              Навигация
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ px: 2, color: "#6b7280" }}>
              •••
            </Typography>
          )}
        </Box>

        <List sx={{ pt: 0 }}>
          {nav.map((item) => {
            const active = location.pathname === item.to;
            const btn = (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                selected={active}
                sx={{
                  mx: 1,
                  my: 0.5,
                  borderRadius: 2,
                  justifyContent: open ? "initial" : "center",
                  px: open ? 2 : 1.5,
                  "&.Mui-selected": { background: "#eef2ff" },
                }}
              >
                <ListItemIcon sx={{ minWidth: open ? 44 : 0, color: active ? "#1d4ed8" : "#111", justifyContent: "center" }}>
                  {item.icon}
                </ListItemIcon>
                {open ? <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700 }} /> : null}
              </ListItemButton>
            );

            return open ? (
              btn
            ) : (
              <Tooltip key={item.to} title={item.label} placement="right">
                <Box>{btn}</Box>
              </Tooltip>
            );
          })}
        </List>

        <Box sx={{ flex: 1 }} />
        <Divider />
        <Box sx={{ p: 2 }}>
          {open ? (
            <>
              <Typography variant="caption" sx={{ color: "#6b7280" }}>
                Demo-проект: FastAPI + Postgres + React (MUI)
              </Typography>
              <Typography variant="caption" sx={{ color: "#9ca3af", display: "block", mt: 0.5 }}>
                Меню запоминает состояние (localStorage).
              </Typography>
            </>
          ) : (
            <Tooltip title="Меню запоминает состояние (localStorage)" placement="right">
              <Typography variant="caption" sx={{ color: "#6b7280" }}>
                i
              </Typography>
            </Tooltip>
          )}
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, background: "#f6f7fb", minHeight: "100vh" }}>
        <Toolbar />
        {children}
      </Box>

      <Dialog open={staffDlg} onClose={() => (!staffMissing ? setStaffDlg(false) : null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Авторизация (демо)</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Для печатных форм и аудита действий достаточно указать ФИО сотрудника. Данные хранятся только в браузере (localStorage).
          </Typography>
          <TextField
            label="ФИО сотрудника"
            fullWidth
            size="small"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="Например: Иванов Иван Иванович"
            sx={{ mb: 1.5 }}
          />
          <TextField
            label="Должность (необязательно)"
            fullWidth
            size="small"
            value={staffPos}
            onChange={(e) => setStaffPos(e.target.value)}
            placeholder="Например: специалист по выдаче карт"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {!staffMissing ? (
            <Button
              onClick={() => {
                clearStaff();
                setStaffName("");
                setStaffPos("");
              }}
              color="inherit"
            >
              Выйти
            </Button>
          ) : (
            <Button color="inherit" disabled>
              Выйти
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          {!staffMissing ? (
            <Button variant="outlined" onClick={() => setStaffDlg(false)}>
              Закрыть
            </Button>
          ) : null}
          <Button
            variant="contained"
            onClick={() => {
              setStaff({ name: staffName, position: staffPos });
              setStaffDlg(false);
            }}
            disabled={!staffName.trim()}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
