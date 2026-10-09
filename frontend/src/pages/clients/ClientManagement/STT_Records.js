// import React, { useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react';
// import {
//     Typography, Card, Row, Col, Space, Button, Form, Select, Input,
//     DatePicker, Spin, Modal, Table, Skeleton, Tag, Descriptions, Divider,
//     App, Collapse, message, Menu, Dropdown, Tooltip, Upload, Checkbox,
//     Timeline, Popconfirm,
// } from 'antd';
// import dayjs from "dayjs";
// import {
//     PlusOutlined, UserOutlined, TeamOutlined, CalendarOutlined,
//     MinusCircleOutlined, ClockCircleOutlined, CheckCircleOutlined,
//     FilterOutlined, DownloadOutlined, LeftOutlined, ReloadOutlined,
//     DeleteOutlined, PlusCircleOutlined, UserAddOutlined, FileTextOutlined,
//     HistoryOutlined, EditOutlined, SaveOutlined, StopOutlined,
// } from '@ant-design/icons';
// import { useNavigate, useLocation } from 'react-router-dom';
// import * as XLSX from 'xlsx-js-style';
// import CreateMonthlyTasksButton from './CreateMonthlyTasksButton';
// import moment from 'moment';
// import { UploadOutlined } from "@ant-design/icons";
// import { SpinnerContext } from '../../../components/SpinnerContext';
// import { api } from '../../../services/api';
// import { useAuth } from '../../../contexts/AuthContext';
// import axios from "axios";

// // ─────────────────────────────────────────────────────────────
// // Constants & tiny helpers
// // ─────────────────────────────────────────────────────────────
// const CAN_ASSIGN_ROLES = ["manager", "team lead", "admin", "founder"];
// const MAX_ASSIGN       = 3;
// const canAssignTask    = (user) => CAN_ASSIGN_ROLES.includes(user?.role?.toLowerCase());
// const canEditDueDate   = (user) => ["admin", "founder"].includes(user?.role?.toLowerCase());

// const { Title, Text } = Typography;
// const { Option }      = Select;
// const { RangePicker } = DatePicker;

// const downloadFileHelper = async (url, filename, msgApi) => {
//     try {
//         const response = await axios.get(url, { responseType: "blob", headers: { Accept: "*/*" } });
//         const blob        = new Blob([response.data]);
//         const downloadUrl = window.URL.createObjectURL(blob);
//         const a = document.createElement("a");
//         a.href = downloadUrl; a.download = filename;
//         document.body.appendChild(a); a.click();
//         a.remove(); window.URL.revokeObjectURL(downloadUrl);
//     } catch { msgApi.error("File download failed"); }
// };

// const calculateTotalMillisFromTimeEntries = (timeEntries = []) => {
//     let ms = 0;
//     timeEntries.forEach(e => {
//         if (e.start_time && e.end_time) {
//             const diff = moment(e.end_time).diff(moment(e.start_time));
//             if (diff > 0) ms += diff;
//         }
//     });
//     return ms;
// };

// export const formatDurationFromMillis = (ms) => {
//     if (!ms || isNaN(ms)) return "0m";
//     const totalMin = Math.round(ms / 60000);
//     const h = Math.floor(totalMin / 60), m = totalMin % 60;
//     return h > 0 ? `${h}h ${m}m` : `${m}m`;
// };



// // const getEffectiveTaskStatus = (task) => {
// //     if (!task) return 'Loading...';
// //     if (task.status === 'Done') return 'Done';
// //     // ↓ Check overdue BEFORE returning the DB status
// //     if (task.due_date && moment(task.due_date).isBefore(moment(), 'day')) return 'Over Due';
// //     return task.status; // 'To Do' or 'In Progress' only if not overdue
// // };

// // const STATUS_COLOR = { 'To Do': 'purple', 'In Progress': 'yellow', 'Done': 'green', 'Over Due': 'red' };


// const STATUS_COLOR = { 
//     'To Do': 'purple', 
//     'In Progress': 'yellow', 
//     'Done': 'green', 
//     'Over Due': 'red',
//     'wip': 'orange',
//     'under_review': 'geekblue',
//     'attention_required': 'volcano',
//     'open': 'cyan',
//     'closed': 'success'
// };

// const getEffectiveTaskStatus = (task) => {
//     if (!task) return 'Loading...';
    
//     // Check if it has an overridden legal status first
//     if (task.legal_status) return task.legal_status;

//     // Standard STT logic fallback
//     if (task.status === 'Done') return 'Done';
//     if (task.due_date && moment(task.due_date).isBefore(moment(), 'day')) return 'Over Due';
//     return task.status; 
// };












// // ─────────────────────────────────────────────────────────────
// // Lookup cache — fetched once per session
// // ─────────────────────────────────────────────────────────────
// const _lookupCache = { data: null, promise: null };

// // Helper to extract array from paginated or plain response
// const toArray = (data) => Array.isArray(data) ? data : (data?.results || []);

// async function fetchLookupsOnce(token) {
//     if (_lookupCache.data)    return _lookupCache.data;
//     if (_lookupCache.promise) return _lookupCache.promise;

//     const headers = { Authorization: `Token ${token}` };
//     // Helper to extract array from paginated or plain response
//     const toArray = (data) => Array.isArray(data) ? data : (data?.results || []);

//     _lookupCache.promise = Promise.all([
//         api.get('/clients/clients-lite/',  { headers }),   // ← Use lite for dropdown
//         api.get('/clients/spocs/',         { headers }),
//         api.get('/clients/subservices/',   { headers }),
//         api.get('/employee/teams/',        { headers }),
//         api.get('/employee/employees/',    { headers }),
//         api.get('/clients/client-groups/', { headers }),
//         api.get('/clients/mainservices/',  { headers }),
//     ]).then(([c, sp, sub, t, emp, g, ms]) => {
//         _lookupCache.data = {
//             clients:      toArray(c.data),
//             spocs:        toArray(sp.data),
//             subservices:  toArray(sub.data),
//             teams:        toArray(t.data),
//             allEmployees: toArray(emp.data),
//             clientGroups: toArray(g.data),
//             mainServices: toArray(ms.data),
//         };
//         _lookupCache.promise = null;
//         return _lookupCache.data;
//     });
//     return _lookupCache.promise;
// }

// export function invalidateLookupCache() { _lookupCache.data = null; _lookupCache.promise = null; }

// // ─────────────────────────────────────────────────────────────
// // CreateTaskModal  (unchanged logic, just cleaned up)
// // ─────────────────────────────────────────────────────────────
// const CreateTaskModal = ({ visible, onClose, onTaskCreated, allEmployees = [], clients = [], spocs = [], subservices = [], teams = [], clientGroups = [], mainServices = [] }) => {
//     const [form]              = Form.useForm();
//     const { user }            = useAuth();
//     const [periodType, setPeriodType]             = useState(null);
//     const [periodStartDate, setPeriodStartDate]   = useState(null);
//     const [customStartDate, setCustomStartDate]   = useState(null);
//     const [customEndDate, setCustomEndDate]       = useState(null);
//     const [uploadEnabled, setUploadEnabled]       = useState(false);
//     const [selectedUserIds, setSelectedUserIds]   = useState([]);

//     useEffect(() => {
//         if (!visible) return;
//         form.resetFields(); setUploadEnabled(false); setPeriodType(null);
//         setPeriodStartDate(null); setCustomStartDate(null); setCustomEndDate(null); setSelectedUserIds([]);
//     }, [visible, form]);

//     const handleClientChange = (clientId) => {
//         form.resetFields(['spoc']);
//         const grp = clientGroups.find(g => g.clients.some(c => c.id === clientId));
//         if (grp?.primary_spoc) form.setFieldsValue({ spoc: grp.primary_spoc });
//         else message.info('No primary SPOC found for this client group.');
//     };

//     const handleSubServiceChange = (id) => {
//         const sub = subservices.find(s => s.id === id);
//         if (!sub?.main_service) { form.setFieldsValue({ team: null }); return; }
//         const ms = mainServices.find(m => m.id === sub.main_service);
//         form.setFieldsValue({ team: ms?.team || null });
//     };

//     const getPeriodEndDate = () => {
//         if (!periodStartDate || !periodType) return null;
//         const map = { monthly: [0,'month'], quarterly: [2,'month'], half_yearly: [5,'month'], annually: [11,'month'] };
//         const [n, unit] = map[periodType] || [];
//         return n !== undefined ? periodStartDate.clone().add(n, unit).endOf('month') : null;
//     };

//     const getPeriodString = () => {
//         if (periodType === "not_applicable") return "NA";
//         if (periodType === "custom") { if (!customStartDate || !customEndDate) return null; return `${customStartDate.format("DD MMM YYYY")} to ${customEndDate.format("DD MMM YYYY")}`; }
//         if (!periodType || !periodStartDate) return null;
//         const start = periodStartDate.format("MMM-YYYY");
//         if (periodType === "monthly") return start;
//         return `${start} to ${getPeriodEndDate()?.format("MMM-YYYY")}`;
//     };

//     const onFinish = async (values) => {
//     const periodString = getPeriodString();
//     try {
//         const fd = new FormData();
//         fd.append("client",      values.client);
//         fd.append("sub_service", values.sub_service);

//         // spoc and team from form
//         const spocVal = form.getFieldValue('spoc');
//         const teamVal = form.getFieldValue('team');
//         if (spocVal) fd.append("spoc", spocVal);
//         if (teamVal) fd.append("team", teamVal);

//         fd.append("due_date", values.due_date?.format("YYYY-MM-DD"));
//         fd.append("period",   periodType === 'not_applicable' ? "NA" : (periodString || ""));

//         // Only append assigned_users if there are any
//         if (selectedUserIds.length > 0) {
//             selectedUserIds.forEach(uid => fd.append("assigned_users", uid));
//         }

//         if (values.file?.[0]?.originFileObj) {
//             fd.append("file", values.file[0].originFileObj);
//         }

//         console.log('Creating task with:', {
//             client: values.client,
//             sub_service: values.sub_service,
//             spoc: spocVal,
//             team: teamVal,
//             due_date: values.due_date?.format("YYYY-MM-DD"),
//             period: periodString
//         });

//         await api.post("/clients/tasks/", fd);
//             message.success("Task created successfully!");
//             form.resetFields(); onTaskCreated(); onClose();
//         } catch (error) {
//             const data = error?.response?.data;
//             if (data?.non_field_errors?.length) message.error(data.non_field_errors[0]);
//             else if (data?.detail) message.error(data.detail);
//             else message.error("Failed to create task.");
//         }
//     };

//     return (
//         <Modal title="Create New Task" open={visible} onCancel={onClose}
//             footer={[<Button key="back" onClick={onClose}>Cancel</Button>, <Button key="submit" type="primary" onClick={() => form.submit()}>Create</Button>]}>
//             <Form form={form} layout="vertical" onFinish={onFinish}>
//                 <Form.Item name="client" label="Client Name" rules={[{ required: true }]}>
//                     <Select showSearch onChange={handleClientChange} placeholder="Select Client" allowClear optionFilterProp="children">
//                         {clients.map(c => <Option key={c.id} value={c.id}>{c.group_name ? `${c.group_name} – ${c.name}` : c.name}</Option>)}
//                     </Select>
//                 </Form.Item>
//                 <Form.Item name="sub_service" label="Description" rules={[{ required: true }]}>
//                     <Select showSearch onChange={handleSubServiceChange} placeholder="Select a Description" allowClear optionFilterProp="children">
//                         {subservices.filter(s => (s.team_name || "").toLowerCase() !== "general").map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
//                     </Select>
//                 </Form.Item>
//                 <Row gutter={16}>
//                     <Col span={12}>
//                         <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}>
//                             <DatePicker style={{ width: '100%' }} disabledDate={(c) => c && c < dayjs().startOf('day')} />
//                         </Form.Item>
//                     </Col>
//                     <Col span={12}>
//                         <Form.Item name="period_type" label="Period Type" rules={[{ required: true }]}>
//                             <Select placeholder="Select Period Type" onChange={(v) => { setPeriodType(v); form.setFieldsValue({ period_start_date: null }); setPeriodStartDate(null); }}>
//                                 {['monthly','quarterly','half_yearly','annually','custom','not_applicable'].map(v => <Option key={v} value={v}>{v.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</Option>)}
//                             </Select>
//                         </Form.Item>
//                     </Col>
//                 </Row>
//                 <Row gutter={16}>
//                     {periodType && !["not_applicable","custom"].includes(periodType) && (
//                         <Col span={12}>
//                             <Form.Item name="period_start_date" label="Period Start Date" rules={[{ required: true }]}>
//                                 <DatePicker picker="month" format="MMM-YYYY" style={{ width: "100%" }} onChange={setPeriodStartDate} />
//                             </Form.Item>
//                         </Col>
//                     )}
//                     {periodType && ["quarterly","half_yearly","annually"].includes(periodType) && (
//                         <Col span={12}><Form.Item label="Period End Date"><Input value={getPeriodEndDate()?.format("MMM-YYYY") || ""} readOnly /></Form.Item></Col>
//                     )}
//                     {periodType === "custom" && (<>
//                         <Col span={12}><Form.Item label="Period Start Date"><DatePicker style={{ width: "100%" }} onChange={setCustomStartDate} /></Form.Item></Col>
//                         <Col span={12}><Form.Item label="Period End Date"><DatePicker style={{ width: "100%" }} disabledDate={c => customStartDate && c.isBefore(customStartDate.startOf("day"))} onChange={setCustomEndDate} /></Form.Item></Col>
//                     </>)}
//                 </Row>
//                 {canAssignTask(user) && (
//                     <Form.Item label="Assign To (Optional)">
//                         <Select mode="multiple" showSearch optionFilterProp="children" value={selectedUserIds} style={{ width: "100%" }} placeholder="Assign employees (max 3)" allowClear maxTagCount={3}
//                             onChange={(vals) => { if (vals.length > MAX_ASSIGN) { message.warning("Only 3 employees allowed"); return; } setSelectedUserIds(vals); }}>
//                             {(allEmployees || []).map(emp => <Select.Option key={emp.user_id} value={emp.user_id} disabled={selectedUserIds.length >= MAX_ASSIGN && !selectedUserIds.includes(emp.user_id)}>{emp.user?.full_name || `${emp.first_name||""} ${emp.last_name||""}`.trim()}</Select.Option>)}
//                         </Select>
//                     </Form.Item>
//                 )}
//                 <Form.Item label=""><Checkbox checked={uploadEnabled} onChange={e => setUploadEnabled(e.target.checked)}>Upload Related File</Checkbox></Form.Item>
//                 {uploadEnabled && (
//                     <Form.Item name="file" valuePropName="fileList" getValueFromEvent={e => Array.isArray(e) ? e : e?.fileList}>
//                         <Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Select File</Button></Upload>
//                     </Form.Item>
//                 )}
//             </Form>
//         </Modal>
//     );
// };

// // ─────────────────────────────────────────────────────────────
// // TaskDetailView
// // ─────────────────────────────────────────────────────────────
// const TaskDetailView = ({ visible, taskId, onClose, onTaskUpdated, allEmployees }) => {
//     const [isSaving, setIsSaving]                 = useState(false);
//     const [form]                                  = Form.useForm();
//     const { user }                                = useAuth();
//     const token                                   = sessionStorage.getItem('token');
//     const { message }                             = App.useApp();
//     const [task, setTask]                         = useState(null);
//     const [isLoading, setIsLoading]               = useState(false);
//     const [error, setError]                       = useState(null);
//     const [proofNotRequired, setProofNotRequired] = useState(false);
//     const [selectedUserIds, setSelectedUserIds]   = useState([]);
//     const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
//     const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
//     const [history, setHistory]                   = useState([]);
//     const [historyVisible, setHistoryVisible]     = useState(false);
//     const [editingEntryId, setEditingEntryId]     = useState(null);
//     const [editEntryForm, setEditEntryForm]       = useState({});
//     const [savingEntry, setSavingEntry]           = useState(false);
//     const [isEditingDueDate, setIsEditingDueDate] = useState(false);
//     const [newDueDate, setNewDueDate]             = useState(null);
//     const [savingDueDate, setSavingDueDate]       = useState(false);

//     const isToday       = (s) => s && dayjs(s).isSame(dayjs(), "day");
//     const effectiveStatus = useMemo(() => getEffectiveTaskStatus(task), [task]);
//     const hasTimeEntries  = (task?.time_entries?.length || 0) > 0;
//     const hasProof        = !!task?.proof_file;
//     const canCompleteTask = hasTimeEntries && (hasProof || proofNotRequired);
//     const isTaskDone      = task?.status === 'Done';

//     useEffect(() => { if (visible) { setProofNotRequired(false); setEditingEntryId(null); setEditEntryForm({}); setIsEditingDueDate(false); setNewDueDate(null); } }, [visible]);

//     // ── No extra API calls — TaskSerializer returns all names already ──────
//     // const fetchTaskDetails = useCallback(async (id) => {
//     //     if (!id) return;
//     //     setTask(null);
//     //     setError(null);
//     //     try {
//     //         const res = await api.get(`/clients/tasks/${id}/`);
//     //         setTask(res.data);
//     //         setSelectedUserIds((res.data.assignments || []).filter(a => a.is_active).map(a => a.user));
//     //     } catch { setError('Failed to load task details.'); message.error('Failed to load task details.'); }
//     //     // finally { setIsLoading(false); }
//     // }, [message]);

//     const fetchTaskDetails = useCallback(async (id) => {
//         if (!id) return;
//         setTask(null);
//         setIsLoading(true);
//         setError(null);
//         try {
//             const res = await api.get(`/clients/tasks/${id}/`);
//             setTask(res.data);
//             setSelectedUserIds((res.data.assignments || []).filter(a => a.is_active).map(a => a.user));
//         } catch {
//             setError('Failed to load task details.');
//             message.error('Failed to load task details.');
//         } finally {
//             setIsLoading(false);
//         }
//     }, [message]);

//     useEffect(() => { if (visible && taskId) fetchTaskDetails(taskId); }, [visible, taskId, fetchTaskDetails]);

//     const handleClose = () => { setTask(null); setEditingEntryId(null); setEditEntryForm({}); onClose(); };

//     const loadHistory = async () => {
//         try { const res = await api.get(`/clients/tasks/${taskId}/history/`); setHistory(res.data || []); setHistoryVisible(true); }
//         catch { message.error("Failed to load history"); }
//     };

//     const startEditEntry  = (e) => { setEditingEntryId(e.id); setEditEntryForm({ start_time: dayjs(e.start_time), end_time: e.end_time ? dayjs(e.end_time) : null, notes: e.notes || "" }); };
//     const cancelEditEntry = () => { setEditingEntryId(null); setEditEntryForm({}); };

//     const saveEditEntry = async (entryId) => {
//         const { start_time, end_time, notes } = editEntryForm;
//         if (!start_time || !end_time) { message.warning("Start and end time are required"); return; }
//         if (!end_time.isAfter(start_time)) { message.error("End time must be after start time"); return; }
//         if (end_time.diff(start_time, "hour", true) > 15) { message.error("Cannot exceed 15 hours"); return; }
//         setSavingEntry(true);
//         try {
//             await api.patch(`/clients/task-time-entries/${entryId}/`, { start_time: start_time.toISOString(), end_time: end_time.toISOString(), notes });
//             message.success("Time entry updated"); setEditingEntryId(null); setEditEntryForm({});
//             await fetchTaskDetails(task.id); onTaskUpdated();
//         } catch (err) { message.error(err?.response?.data?.detail || "Failed to update time entry"); }
//         finally { setSavingEntry(false); }
//     };

//     const deleteTimeEntry = async (entryId) => {
//         try { await api.delete(`/clients/task-time-entries/${entryId}/`); message.success("Time entry deleted"); await fetchTaskDetails(task.id); onTaskUpdated(); }
//         catch (err) { message.error(err?.response?.data?.detail || "Failed to delete time entry"); }
//     };

//     const handleQuickAdd = (form, rowIndex, minutes) => {
//         const entries = form.getFieldValue("time_entries") || [];
//         const row = entries[rowIndex];
//         if (!row?.start_time) { message.warning("Please select start time first"); return; }
//         const start = dayjs(row.start_time), now = dayjs(), maxEnd = start.add(15, "hour");
//         let newEnd = (row.end_time ? dayjs(row.end_time) : start).add(minutes, "minute");
//         if (newEnd.isAfter(maxEnd)) newEnd = maxEnd;
//         if (newEnd.isAfter(now))    newEnd = now;
//         if (!newEnd.isAfter(start)) { message.error("End time must be after start time"); return; }
//         const fp = ["time_entries", rowIndex, "end_time"];
//         form.setFieldValue(fp, newEnd); form.validateFields([fp]);
//     };

//     const handleFinish = async (values) => {
//         setIsSaving(true);
//         try {
//             const loggedInUserName = user?.full_name || user?.email || "Logged-in User";
//             const timeEntries = values.time_entries || [];
//             for (let i = 0; i < timeEntries.length; i++) {
//                 const e = timeEntries[i];
//                 if (!e.start_time || !e.end_time) continue;
//                 const s = dayjs(e.start_time), en = dayjs(e.end_time), now = dayjs();
//                 if (!en.isAfter(s))                    { message.error("End time must be after start time"); return; }
//                 if (en.diff(s,"hour",true) > 15)       { message.error("Cannot exceed 15 hours"); return; }
//                 if (en.isAfter(now.add(1,'minute')))   { message.error("Future time not allowed"); return; }
//                 const overlaps = timeEntries.some((o, idx) => { if (i===idx || !o.start_time || !o.end_time) return false; const oS=dayjs(o.start_time),oE=dayjs(o.end_time); return s.isBefore(oE)&&en.isAfter(oS); });
//                 if (overlaps) { message.error("Time entries cannot overlap"); return; }
//             }
//             const newEntries = timeEntries.map(e => ({ employee_name: loggedInUserName, start_time: e.start_time ? dayjs(e.start_time).toISOString() : null, end_time: e.end_time ? dayjs(e.end_time).toISOString() : null, notes: e.notes || null }));
//             let newStatus = task.status;
//             if (newStatus === "To Do" && newEntries.some(e => e.start_time)) newStatus = "In Progress";
//             const fd = new FormData();
//             fd.append("status", newStatus); fd.append("notes", values.notes || "");
//             (selectedUserIds||[]).forEach(uid => fd.append("assigned_users", uid));
//             if (values.file?.[0]?.originFileObj) fd.append("file", values.file[0].originFileObj);
//             fd.append("assigned_employees_data", JSON.stringify([{ employee_name: loggedInUserName, time_entries: newEntries }]));
//             await api.patch(`/clients/tasks/${task.id}/`, fd);
//             await fetchTaskDetails(task.id); message.success("Task updated successfully!"); onTaskUpdated(); form.resetFields();
//         } catch (error) {
//             const data = error.response?.data;
//             let msg = "Failed to update task";
//             if (data?.detail) msg = data.detail;
//             else if (typeof data?.error === "string") msg = data.error;
//             else if (Array.isArray(data?.error)) msg = data.error[0];
//             else if (data?.non_field_errors) msg = data.non_field_errors[0];
//             message.error(msg);
//         } finally { setIsSaving(false); }
//     };

//     const handleAssignMultiple = async () => {
//         setIsSaving(true);
//         try { await api.post(`/clients/tasks/${task.id}/assign_multiple/`, { user_ids: selectedUserIds }); message.success("Assignments updated"); setAssignDropdownOpen(false); await fetchTaskDetails(task.id); onTaskUpdated(); }
//         catch { message.error("Failed to update assignments"); }
//         finally { setIsSaving(false); }
//     };

//     const handleMarkCompleted = async () => {
//         setIsSaving(true);
//         try { await api.patch(`/clients/tasks/${task.id}/`, { status: "Done" }); message.success("Task marked as completed"); setShowCompleteConfirm(false); onTaskUpdated(); handleClose(); }
//         catch { message.error("Failed to mark task as completed"); }
//         finally { setIsSaving(false); }
//     };

//     const timeEntriesColumns = [
//         { title: 'Start Time', dataIndex: 'start_time', key: 'start_time', width: 190, render: (text, rec) => editingEntryId===rec.id ? <DatePicker showTime={{ use12Hours:true, format:"h:mm A" }} format="DD MMM YYYY h:mm A" value={editEntryForm.start_time} style={{ width:"100%" }} disabledDate={d=>d&&d>dayjs().endOf("day")} onChange={v=>setEditEntryForm(f=>({...f,start_time:v}))} size="small" /> : (text ? moment(text).format('DD MMM YYYY, h:mm A') : '-') },
//         { title: 'End Time',   dataIndex: 'end_time',   key: 'end_time',   width: 190, render: (text, rec) => editingEntryId===rec.id ? <DatePicker showTime={{ use12Hours:true, format:"h:mm A" }} format="DD MMM YYYY h:mm A" value={editEntryForm.end_time} style={{ width:"100%" }} onChange={v=>setEditEntryForm(f=>({...f,end_time:v}))} size="small" /> : (text ? moment(text).format('DD MMM YYYY, h:mm A') : <Tag color="processing">Running</Tag>) },
//         { title: 'Duration', key: 'duration', width: 90, render: (_,rec) => { const s=editingEntryId===rec.id?editEntryForm.start_time:(rec.start_time?dayjs(rec.start_time):null); const e=editingEntryId===rec.id?editEntryForm.end_time:(rec.end_time?dayjs(rec.end_time):null); if(!s||!e) return '-'; const mins=e.diff(s,"minute"); return mins>0?`${Math.floor(mins/60)}h ${mins%60}m`:'-'; } },
//         { title: 'Comment', dataIndex: 'notes', key: 'notes', render: (text,rec) => editingEntryId===rec.id ? <Input value={editEntryForm.notes} onChange={e=>setEditEntryForm(f=>({...f,notes:e.target.value}))} placeholder="Comment" size="small" /> : (text||'-') },
//         { title: '', key: 'entry_actions', width: 90, render: (_,rec) => {
//             const myName = user?.full_name || `${user?.first_name||""} ${user?.last_name||""}`.trim();
//             if (rec.employee_name!==myName || !isToday(rec.start_time) || isTaskDone) return null;
//             if (editingEntryId===rec.id) return <Space size={4}><Button type="primary" size="small" icon={<SaveOutlined/>} loading={savingEntry} onClick={()=>saveEditEntry(rec.id)}/><Button size="small" icon={<StopOutlined/>} onClick={cancelEditEntry}/></Space>;
//             return <Space size={4}><Button size="small" icon={<EditOutlined/>} onClick={()=>startEditEntry(rec)}/><Popconfirm title="Delete this time entry?" description="This cannot be undone." onConfirm={()=>deleteTimeEntry(rec.id)} okText="Delete" okButtonProps={{danger:true}} cancelText="Cancel"><Button size="small" danger icon={<DeleteOutlined/>}/></Popconfirm></Space>;
//         }},
//     ];

//     const groupedEntries = useMemo(() => {
//         const grouped = {};
//         (task?.time_entries || []).forEach(e => { const n=e.employee_name||'Unknown'; if(!grouped[n]) grouped[n]=[]; grouped[n].push(e); });
//         return Object.entries(grouped).map(([employee_name, time_entries]) => ({ employee_name, time_entries }));
//     }, [task?.time_entries]);

//     const getFileName      = (url) => { try { return decodeURIComponent(new URL(url, window.location.origin).pathname.split("/").pop()||""); } catch { return decodeURIComponent((url.split("?")[0]||"").split("/").pop()||""); } };
//     const getproofFileName = (url) => { try { return decodeURIComponent(new URL(url, window.location.origin).pathname.split("/").pop()).replace(/_[A-Za-z0-9]+(\.[a-zA-Z0-9]+)$/,"$1"); } catch { return decodeURIComponent(url.split("/").pop()).replace(/_[A-Za-z0-9]+(\.[a-zA-Z0-9]+)$/,"$1"); } };
//     const historyIcon = (type) => ({ created:<PlusCircleOutlined style={{color:"#1677ff"}}/>, assigned:<UserAddOutlined style={{color:"#fa8c16"}}/>, time:<ClockCircleOutlined style={{color:"#722ed1"}}/>, proof:<FileTextOutlined style={{color:"#13c2c2"}}/>, done:<CheckCircleOutlined style={{color:"#52c41a"}}/> }[type]||null);

//     return (
//         <>
//             <Modal open={showCompleteConfirm} title="Confirm Completion" onCancel={()=>setShowCompleteConfirm(false)} footer={[<Button key="no" onClick={()=>setShowCompleteConfirm(false)}>No</Button>, <Button key="yes" type="primary" danger onClick={handleMarkCompleted}>Yes, Mark Completed</Button>]}>
//                 <p>Once completed, you or your team will <b>not be able to add time entries</b> for this task.<br/>Are you sure?</p>
//             </Modal>

//             <Modal title={`Task Details: ${task?.task_id||""} - (${task?.sub_service_name||""})`} open={visible} onCancel={handleClose} width={800} bodyStyle={{padding:0}} style={{top:60}}
//                 footer={[
//                     <Button icon={<HistoryOutlined/>} onClick={loadHistory}>History</Button>,
//                     !isTaskDone && <Button type="primary" danger disabled={!canCompleteTask} onClick={()=>setShowCompleteConfirm(true)}>Mark Completed</Button>,
//                     <Button key="close" onClick={handleClose}>Close</Button>,
//                     !isTaskDone && <Button key="save" type="primary" loading={isSaving} onClick={()=>form.submit()}>Save</Button>,
//                 ].filter(Boolean)}>
//                 <div style={{maxHeight:"73vh",overflowY:"auto",scrollbarWidth:"none"}}>
//                     {isLoading
//                     ? <div style={{padding:50,textAlign:'center'}}><Spin/></div>
//                     : error   ? <div style={{padding:20}}><Text type="danger">{error}</Text></div>
//                     : task    ? (
//                         <>
//                             <Descriptions column={{xs:1,sm:2,md:2,lg:3}} layout="vertical">
//                                 <Descriptions.Item label="Client">{task.client_name}</Descriptions.Item>
//                                 <Descriptions.Item label="Period">{task.period}</Descriptions.Item>
//                                 <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[effectiveStatus]||'default'}>{effectiveStatus}</Tag></Descriptions.Item>
//                                 <Descriptions.Item label="Due Date">
//                                     {canEditDueDate(user)&&!isTaskDone ? (
//                                         isEditingDueDate ? (
//                                             <Space size={4}>
//                                                 <DatePicker size="small" value={newDueDate} format="DD MMM YYYY" disabledDate={c=>c&&c<dayjs().startOf('day')} onChange={setNewDueDate}/>
//                                                 <Button size="small" type="primary" icon={<SaveOutlined/>} loading={savingDueDate} onClick={async()=>{
//                                                     if(!newDueDate){message.warning("Please select a date");return;}
//                                                     setSavingDueDate(true);
//                                                     try{ await api.patch(`/clients/tasks/${task.id}/`,{due_date:newDueDate.format("YYYY-MM-DD")}); message.success("Due date updated"); setTask(p=>({...p,due_date:newDueDate.format("YYYY-MM-DD")})); setIsEditingDueDate(false); onTaskUpdated(); }
//                                                     catch{message.error("Failed to update due date");}
//                                                     finally{setSavingDueDate(false);}
//                                                 }}/>
//                                                 <Button size="small" icon={<StopOutlined/>} onClick={()=>setIsEditingDueDate(false)}/>
//                                             </Space>
//                                         ) : <Space size={4}><span>{moment(task.due_date).format("DD MMM YYYY")}</span><Button size="small" type="text" icon={<EditOutlined/>} onClick={()=>{setNewDueDate(dayjs(task.due_date));setIsEditingDueDate(true);}}/></Space>
//                                     ) : moment(task.due_date).format("DD MMM YYYY")}
//                                 </Descriptions.Item>
//                                 <Descriptions.Item label="Team">{task.team_name}</Descriptions.Item>
//                                 <Descriptions.Item label="Assigned To">{task.assignments?.length ? task.assignments.filter(a=>a.is_active).map(a=>a.user_name).join(", ") : "Not assigned"}</Descriptions.Item>
//                                 <Descriptions.Item label="SPOC">{task.spoc_name}</Descriptions.Item>
//                                 <Descriptions.Item label="Total Hours">{formatDurationFromMillis(calculateTotalMillisFromTimeEntries(task.time_entries||[]))}</Descriptions.Item>
//                                 <Descriptions.Item label="Created By">{task.created_by_username||"System"}</Descriptions.Item>
//                             </Descriptions>

//                             {task?.file && <Descriptions.Item label="Related File"><Button type="link" icon={<FileTextOutlined/>} onClick={()=>downloadFileHelper(task.file,getFileName(task.file),message)}>{getFileName(task.file)}</Button></Descriptions.Item>}

//                             {/* {canAssignTask(user)&&!isTaskDone&&(
//                                 <Form.Item label="Assign To" style={{marginTop:16}}>
//                                     <Space>
//                                         <Select mode="multiple" showSearch optionFilterProp="children" value={selectedUserIds} open={assignDropdownOpen} onDropdownVisibleChange={setAssignDropdownOpen} style={{width:300}} placeholder="Assign employees (max 3)" allowClear maxTagCount={3} onChange={vals=>{if(vals.length>MAX_ASSIGN){message.warning("Only 3 employees allowed");return;}setSelectedUserIds(vals);}}>
//                                             {(allEmployees||[]).map(emp=><Select.Option key={emp.user_id} value={emp.user_id} disabled={selectedUserIds.length>=MAX_ASSIGN&&!selectedUserIds.includes(emp.user_id)}>{emp.user?.full_name||`${emp.first_name||""} ${emp.last_name||""}`.trim()}</Select.Option>)}
//                                         </Select>
//                                         <Button type="primary" loading={isSaving} onClick={handleAssignMultiple}>Save Assignment</Button>
//                                     </Space>
//                                 </Form.Item>
//                             )} */}

//                             {/* Self-assign button for employees */}
//                             {!canAssignTask(user) && !isTaskDone && (() => {
//                                 const currentUserId = user?.id;
//                                 const isAlreadyAssigned = (task?.assignments || [])
//                                     .filter(a => a.is_active)
//                                     .some(a => a.user === currentUserId);
//                                 const assignedCount = (task?.assignments || []).filter(a => a.is_active).length;

//                                 return !isAlreadyAssigned && assignedCount < MAX_ASSIGN ? (
//                                     <Form.Item label="Assign To" style={{ marginTop: 16 }}>
//                                         <Button
//                                             type="default"
//                                             icon={<UserAddOutlined />}
//                                             loading={isSaving}
//                                             onClick={async () => {
//                                                 setIsSaving(true);
//                                                 try {
//                                                     const currentAssignedIds = (task?.assignments || [])
//                                                         .filter(a => a.is_active)
//                                                         .map(a => a.user);
//                                                     await api.post(`/clients/tasks/${task.id}/assign_multiple/`, {
//                                                         user_ids: [...currentAssignedIds, currentUserId],
//                                                     });
//                                                     message.success("You have been assigned to this task");
//                                                     await fetchTaskDetails(task.id);
//                                                     onTaskUpdated();
//                                                 } catch {
//                                                     message.error("Failed to assign yourself to this task");
//                                                 } finally {
//                                                     setIsSaving(false);
//                                                 }
//                                             }}
//                                         >
//                                             Assign Myself to This Task
//                                         </Button>
//                                     </Form.Item>
//                                 ) : isAlreadyAssigned ? (
//                                     <Form.Item label="Assign To" style={{ marginTop: 16 }}>
//                                         <Tag color="green" icon={<CheckCircleOutlined />}>
//                                             You are assigned to this task
//                                         </Tag>
//                                     </Form.Item>
//                                 ) : null;
//                             })()}

//                             {/* Multi-assign for managers/leads/admin/founder */}
//                             {canAssignTask(user) && !isTaskDone && (
//                                 <Form.Item label="Assign To" style={{ marginTop: 16 }}>
//                                     <Space>
//                                         <Select
//                                             mode="multiple"
//                                             showSearch
//                                             optionFilterProp="children"
//                                             value={selectedUserIds}
//                                             open={assignDropdownOpen}
//                                             onDropdownVisibleChange={setAssignDropdownOpen}
//                                             style={{ width: 300 }}
//                                             placeholder="Assign employees (max 3)"
//                                             allowClear
//                                             maxTagCount={3}
//                                             onChange={vals => {
//                                                 if (vals.length > MAX_ASSIGN) { message.warning("Only 3 employees allowed"); return; }
//                                                 setSelectedUserIds(vals);
//                                             }}
//                                         >
//                                             {(allEmployees || []).map(emp =>
//                                                 <Select.Option
//                                                     key={emp.user_id}
//                                                     value={emp.user_id}
//                                                     disabled={selectedUserIds.length >= MAX_ASSIGN && !selectedUserIds.includes(emp.user_id)}
//                                                 >
//                                                     {emp.user?.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim()}
//                                                 </Select.Option>
//                                             )}
//                                         </Select>
//                                         <Button type="primary" loading={isSaving} onClick={handleAssignMultiple}>
//                                             Save Assignment
//                                         </Button>
//                                     </Space>
//                                 </Form.Item>
//                             )}

//                             <Divider/><Title level={5}>Assigned Employees & Time Entries</Title>
//                             {task.time_entries?.length ? groupedEntries.map((emp,i)=>(
//                                 <div key={i} style={{marginBottom:20,border:"1px solid #f0f0f0",padding:15,borderRadius:8}}>
//                                     <Title level={5}><UserOutlined/> {emp.employee_name}</Title>
//                                     <Table dataSource={emp.time_entries} columns={timeEntriesColumns} pagination={false} size="small" rowKey="id" scroll={{x:"max-content"}}/>
//                                 </div>
//                             )) : <Text type="secondary">No employee time entries recorded.</Text>}

//                             {!isTaskDone&&(
//                                 <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false}>
//                                     <Divider orientation="left">Time Logs</Divider>
//                                     <Form.List name="time_entries">
//                                         {(fields,{add,remove})=>(
//                                             <>
//                                                 {fields.map(({key,name,...restField},index)=>(
//                                                     <Row key={key} gutter={15} align="top" style={{marginBottom:16}}>
//                                                         <Col span={6}>
//                                                             <Form.Item {...restField} name={[name,"start_time"]} rules={[{required:true,message:"Please select start time"}]}>
//                                                                 <DatePicker showTime={{use12Hours:true,format:"h:mm A"}} format="YYYY-MM-DD h:mm A" style={{width:"100%"}} placeholder="Start time" disabledDate={c=>c&&c>dayjs().endOf('day')}/>
//                                                             </Form.Item>
//                                                         </Col>
//                                                         <Col span={6}>
//                                                             <Form.Item {...restField} name={[name,"end_time"]} dependencies={[["time_entries",name,"start_time"]]} rules={[{required:true,message:"Please select end time"},({getFieldValue})=>({validator(_,value){const start=getFieldValue(["time_entries",name,"start_time"]);if(!start||!value)return Promise.resolve();const s=dayjs(start),e=dayjs(value),now=dayjs();if(e<=s)return Promise.reject(new Error("End time must be after start time"));if(e.diff(s,'hour',true)>15)return Promise.reject(new Error("Cannot exceed 15 hours"));if(e.isAfter(now.add(1,'minute')))return Promise.reject(new Error("Future time not allowed"));return Promise.resolve();}})]}>
//                                                                 <DatePicker showTime={{use12Hours:true,format:"h:mm A"}} format="YYYY-MM-DD h:mm A" style={{width:"100%"}} placeholder="End time" disabledDate={current=>{const start=form.getFieldValue(["time_entries",name,"start_time"]);if(!start)return false;const s=dayjs(start),maxDt=s.add(15,"hour"),now=dayjs(),upper=maxDt.isBefore(now)?maxDt:now;return current.isBefore(s.startOf("day"))||current.isAfter(upper.endOf("day"));}}/>
//                                                             </Form.Item>
//                                                             <Space size="small" style={{marginTop:-6}}>
//                                                                 {[5,10,30,60].map(m=><Button key={m} size="small" onClick={()=>handleQuickAdd(form,index,m)}>{m<60?`+${m}m`:'+1h'}</Button>)}
//                                                             </Space>
//                                                             <Form.Item noStyle shouldUpdate>{()=>{const s=form.getFieldValue(["time_entries",name,"start_time"]);const e=form.getFieldValue(["time_entries",name,"end_time"]);if(!s||!e)return null;const mins=dayjs(e).diff(dayjs(s),"minute");return <div style={{marginTop:4,color:"#52c41a",fontSize:12}}>⏱ Duration: {Math.floor(mins/60)}h {mins%60}m</div>;}}</Form.Item>
//                                                         </Col>
//                                                         <Col span={11}>
//                                                             <Form.Item {...restField} name={[name,"notes"]} rules={[{required:true,message:"Missing comment"}]}>
//                                                                 <Input placeholder="Comment"/>
//                                                             </Form.Item>
//                                                         </Col>
//                                                         <Col span={1}><MinusCircleOutlined onClick={()=>remove(name)} style={{color:"red",cursor:"pointer",marginTop:8}}/></Col>
//                                                     </Row>
//                                                 ))}
//                                                 <Form.Item><Button type="dashed" onClick={()=>add()} block icon={<ClockCircleOutlined/>}>Add Time Entry</Button></Form.Item>
//                                             </>
//                                         )}
//                                     </Form.List>
//                                 </Form>
//                             )}

//                             <Divider/>
//                             <div style={{display:"flex",flexDirection:"column"}}>
//                                 <Title level={5}>Proof</Title>
//                                 {task?.proof_file ? (
//                                     <div style={{display:"flex",alignItems:"center",gap:8}}>
//                                         <a href={task.proof_file} target="_blank" rel="noopener noreferrer">{getproofFileName(task.proof_file)}</a>
//                                         {!isTaskDone&&<DeleteOutlined style={{color:"red",cursor:"pointer"}} onClick={async()=>{try{await api.patch(`/clients/tasks/${task.id}/`,{proof_file:null});message.success("Proof removed");setTask(p=>({...p,proof_file:null}));setProofNotRequired(false);onTaskUpdated();}catch{message.error("Failed to remove proof");}}}/>}
//                                     </div>
//                                 ) : !isTaskDone&&(
//                                     <>
//                                         <Upload showUploadList={false} customRequest={async({file,onSuccess,onError})=>{const fd=new FormData();fd.append("proof_file",file);try{const res=await api.patch(`/clients/tasks/${task.id}/`,fd);message.success("Proof uploaded");setTask(p=>({...p,proof_file:res.data.proof_file}));setProofNotRequired(false);onTaskUpdated();onSuccess("ok");}catch(err){message.error("Proof upload failed");onError(err);}}}>
//                                             <Button icon={<UploadOutlined/>}>Upload Proof</Button>
//                                         </Upload>
//                                         <Checkbox style={{marginTop:8}} checked={proofNotRequired} onChange={e=>setProofNotRequired(e.target.checked)}>Proof not required</Checkbox>
//                                     </>
//                                 )}
//                                 {!hasTimeEntries&&!isTaskDone&&<Text type="secondary" style={{marginTop:8}}>Add at least one time entry to complete the task</Text>}
//                                 {!hasProof&&!proofNotRequired&&hasTimeEntries&&!isTaskDone&&<Text type="warning" style={{marginTop:8}}>Upload proof or mark proof as not required to complete the task</Text>}
//                             </div>
//                         </>
//                     ) : null}
//                 </div>
//             </Modal>

//             <Modal open={historyVisible} title={`History – ${task?.task_id}`} footer={null} onCancel={()=>setHistoryVisible(false)} width={700}>
//                 <Timeline mode="left" items={history.map((h,idx)=>({ key:idx, dot:historyIcon(h.type), label:moment.utc(h.time).local().format("DD MMM YYYY hh:mm A"), children:<div><div style={{fontWeight:600}}>{h.type==="time"?`Added time: ${moment(h.start_time).format("hh:mm A")} → ${moment(h.end_time).format("hh:mm A")}`:h.message}</div><div style={{color:"#888"}}>By {h.user}{h.type==="done"&&<Tag color="green" style={{marginLeft:8}}>Done</Tag>}</div></div> }))}/>
//             </Modal>
//         </>
//     );
// };

// // ─────────────────────────────────────────────────────────────
// // TaskTableView  — server-side pagination
// // ─────────────────────────────────────────────────────────────
// // const TaskTableView = ({ tasks, onTaskClick, pagination, setPagination, loading, totalCount }) => {
// //     const skeletonRows = useMemo(() =>
// //         Array.from({ length: pagination.pageSize || 50 }).map((_,i) => ({ id:`skeleton-${i}`, __skeleton:true })),
// //     [pagination.pageSize]);

//     // const columns = [
//     //     { title:"Sl No", key:"serial_number", width:60, render:(_,rec,idx) => rec.__skeleton ? <Skeleton.Input active size="small" style={{width:30}}/> : (pagination.current-1)*pagination.pageSize+idx+1 },
//     //     { title:"Task ID",     dataIndex:"task_id",          key:"task_id",          sorter:true, render:(v,r)=>r.__skeleton?<Skeleton.Input active size="small" style={{width:80}}/>:v },
//     //     { title:"Date",        dataIndex:"created_at",       key:"created_at",       sorter:true, render:(d,r)=>r.__skeleton?<Skeleton.Input active size="small" style={{width:80}}/>:(d?moment(d).format("DD-MM-YYYY"):"-") },
//     //     { title:"Client",      dataIndex:"client_name",      key:"client_name",      sorter:true, width:300, render:(n,r)=>r.__skeleton?<Skeleton.Input active size="small" style={{width:200}}/>:<Tooltip title={<div><b>Group:</b> {r.client_group_name||"—"}</div>} placement="right"><div style={{whiteSpace:"normal",wordBreak:"break-word",cursor:"pointer"}}>{n}</div></Tooltip> },
//     //     { title:"Description", dataIndex:"sub_service_name", key:"sub_service_name", sorter:true, render:(v,r)=>r.__skeleton?<Skeleton.Input active size="small" style={{width:120}}/>:v },
//     //     { title:"SPOC",        dataIndex:"spoc_name",        key:"spoc_name",        sorter:true, render:(v,r)=>r.__skeleton?<Skeleton.Input active size="small" style={{width:80}}/>:v },
//     //     { title:"Period",      dataIndex:"period",           key:"period" },
//     //     { title:"Due Date",    dataIndex:"due_date",         key:"due_date",         sorter:true, render:(d,r)=>r.__skeleton?<Skeleton.Input active size="small" style={{width:80}}/>:(d?moment(d).format("YYYY-MM-DD"):"-") },
//     //     { title:"Status",      dataIndex:"status",           key:"status",           sorter:true, render:(s,r)=>{ if(r.__skeleton||typeof s!=="string") return s||null; return <Tag color={STATUS_COLOR[s]||'default'}>{s.toUpperCase()}</Tag>; } },
//     //     { title:"Created By",  dataIndex:"created_by_name",  key:"created_by_name",  sorter:true, render:(t,r)=>r.__skeleton?<Skeleton.Input active size="small" style={{width:100}}/>:(t||"System") },
//     //     { title:"Team",        dataIndex:"team_name",        key:"team_name",        sorter:true, render:(v,r)=>r.__skeleton?<Skeleton.Input active size="small" style={{width:80}}/>:v },
//     // ];

// const TaskTableView = ({ tasks, onTaskClick, pagination, setPagination, loading, totalCount, allEmployees }) => {
//     const employeeNameMap = useMemo(() => {
//         const map = {};
//         allEmployees.forEach(emp => {
//             map[emp.user_id] = emp.user?.full_name || `${emp.first_name||""} ${emp.last_name||""}`.trim();
//         });
//         return map;
//     }, [allEmployees]);
//     const getAssignedNames = (rec) =>
//         (rec.assigned_user_ids || []).map(id => employeeNameMap[id] || `User ${id}`);

//     const columns = [
//         {
//             title: "Sl No", key: "serial_number", width: 60,
//             render: (_, rec, idx) => (pagination.current - 1) * pagination.pageSize + idx + 1,
//         },
//         {
//             title: "Task ID", dataIndex: "task_id", key: "task_id",
//             sorter: (a, b) => (a.task_id || "").localeCompare(b.task_id || ""),
//         },
//         {
//             title: "Date", dataIndex: "created_at", key: "created_at",
//             sorter: (a, b) => moment(a.created_at || 0).unix() - moment(b.created_at || 0).unix(),
//             render: (d) => d ? moment(d).format("DD-MM-YYYY") : "-",
//         },
//         {
//             title: "Client", dataIndex: "client_name", key: "client_name", width: 300,
//             sorter: (a, b) => (a.client_name || "").localeCompare(b.client_name || ""),
//             render: (n, r) => (
//                 <Tooltip title={<div><b>Group:</b> {r.client_group_name || "—"}</div>} placement="right">
//                     <div style={{ whiteSpace: "normal", wordBreak: "break-word", cursor: "pointer" }}>{n}</div>
//                 </Tooltip>
//             ),
//         },
//         {
//             title: "Description", dataIndex: "sub_service_name", key: "sub_service_name",
//             sorter: (a, b) => (a.sub_service_name || "").localeCompare(b.sub_service_name || ""),
//         },
//         // {
//         //     title: "SPOC", dataIndex: "spoc_name", key: "spoc_name",
//         //     sorter: (a, b) => (a.spoc_name || "").localeCompare(b.spoc_name || ""),
//         // },
//         {
//             title: "Assigned To", key: "assigned_to",
//             sorter: (a, b) => getAssignedNames(a).join(", ").localeCompare(getAssignedNames(b).join(", ")),
//             render: (_, rec) => {
//                 const names = getAssignedNames(rec);
//                 return names.length ? names.join(", ") : "";
//             },
//         },
//         { title: "Period", dataIndex: "period", key: "period" },
//         {
//             title: "Due Date", dataIndex: "due_date", key: "due_date",
//             sorter: (a, b) => moment(a.due_date).unix() - moment(b.due_date).unix(),
//             render: (d) => d ? moment(d).format("YYYY-MM-DD") : "-",
//         },
        
//         // {
//         //   title: "Status",
//         //   key: "status",
//         //   sorter: (a, b) =>
//         //       getEffectiveTaskStatus(a).localeCompare(
//         //           getEffectiveTaskStatus(b)
//         //       ),

//         //   render: (_, record) => {
//         //       const status = getEffectiveTaskStatus(record);

//         //       return (
//         //           <Tag color={STATUS_COLOR[status] || "default"}>
//         //               {status.toUpperCase()}
//         //           </Tag>
//         //       );
//         //   },
//         // },


//         {
//             title: "Status",
//             key: "status",
//             sorter: (a, b) => getEffectiveTaskStatus(a).localeCompare(getEffectiveTaskStatus(b)),
//             render: (_, record) => {
//                 const status = getEffectiveTaskStatus(record);
//                 // Formats 'attention_required' -> 'ATTENTION REQUIRED'
//                 const displayStatus = status.replace(/_/g, ' ').toUpperCase();

//                 return (
//                     <Tag color={STATUS_COLOR[status] || "default"}>
//                         {displayStatus}
//                     </Tag>
//                 );
//             },
//         },







//         {
//             title: "Created By", dataIndex: "created_by_name", key: "created_by_name",
//             sorter: (a, b) => (a.created_by_name || "").localeCompare(b.created_by_name || ""),
//             render: (t) => t || "System",
//         },
//         {
//             title: "Team", dataIndex: "team_name", key: "team_name",
//             sorter: (a, b) => (a.team_name || "").localeCompare(b.team_name || ""),
//         },
//     ];

//     return (
//         <Table
//             // dataSource={loading ? skeletonRows : tasks}
//             dataSource={tasks}
//             columns={columns} rowKey="id" size="small" bordered
//             // ── Server-side pagination ──────────────────────────────────────
//             // total comes from the API (res.data.count), not tasks.length
//             // This means only 50 rows are ever rendered at once
//             pagination={{
//                 current:         pagination.current,
//                 pageSize:        pagination.pageSize,
//                 total:           totalCount,           // ← total from API
//                 showSizeChanger: true,
//                 pageSizeOptions: ['20','50','100','200'],
//                 showTotal:       (total, range) => `${range[0]}-${range[1]} of ${total} records`,
//                 onChange:        (page, pageSize) => setPagination({ current: page, pageSize }),
//             }}
//             style={{marginTop:2,fontSize:'8px'}}
//             components={{ body:{ row:p=><tr {...p} style={{lineHeight:'1.2'}}/>, cell:p=><td {...p} style={{padding:'4px'}}/> } }}
//             scroll={{x:'max-content'}}
//             // onRow={(record)=>({
//             //     onClick:()=>{ if(!loading&&!record.__skeleton) onTaskClick(record.id); },
//             //     style:{cursor:loading?"default":"pointer",opacity:loading?0.6:1}
//             // })}
//             onRow={(record) => ({
//                 onClick: () => onTaskClick(record.id),
//                 style: { cursor: "pointer" }
//             })}
//         />
//     );
// };

// // ─────────────────────────────────────────────────────────────
// // FilterForm
// // ─────────────────────────────────────────────────────────────
// const FilterForm = ({ clients, subservices, spocs, teams, tasks, onFilter, onReset, initialValues, isClientFilterDisabled }) => {
//     const [form] = Form.useForm();
//     useEffect(() => { form.setFieldsValue(initialValues); }, [initialValues, form]);

//     const createdByOptions = useMemo(() =>
//         Array.from(new Set((tasks||[]).map(t=>t.created_by_name).filter(Boolean))).sort((a,b)=>a.localeCompare(b)),
//     [tasks]);

//     return (
//         <Form form={form} layout="vertical" onValuesChange={(_,all)=>onFilter(all)} style={{marginTop:16,marginBottom:24}}>
//             <Row gutter={16}>
//                 <Col xs={24} sm={12} md={8} lg={6}><Form.Item name="task_id" label="Task ID"><Input placeholder="Search Task ID" allowClear/></Form.Item></Col>
//                 <Col xs={24} sm={12} md={8} lg={6}>
//                     <Form.Item name="client" label="Client">
//                         <Select mode="multiple" allowClear placeholder="Select Client(s)" disabled={isClientFilterDisabled} showSearch optionFilterProp="children">
//                             {[...clients].sort((a,b)=>`${a.group_name||''} ${a.name}`.toLowerCase().localeCompare(`${b.group_name||''} ${b.name}`.toLowerCase())).map(c=><Option key={c.id} value={c.id}>{c.group_name?`${c.group_name} – ${c.name}`:c.name}</Option>)}
//                         </Select>
//                     </Form.Item>
//                 </Col>
//                 <Col xs={24} sm={12} md={8} lg={6}>
//                     <Form.Item name="subservice" label="Description">
//                         <Select mode="multiple" allowClear placeholder="Select Description(s)" showSearch optionFilterProp="children">
//                             {[...subservices].sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase())).map(s=><Option key={s.id} value={s.id}>{s.name}</Option>)}
//                         </Select>
//                     </Form.Item>
//                 </Col>
//                 <Col xs={24} sm={12} md={8} lg={6}>
//                     <Form.Item name="spoc" label="SPOC">
//                         <Select mode="multiple" allowClear placeholder="Select SPOC(s)" showSearch optionFilterProp="children">
//                             {[...spocs].sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase())).map(s=><Option key={s.id} value={s.id}>{s.name}</Option>)}
//                         </Select>
//                     </Form.Item>
//                 </Col>
//                 <Col xs={24} sm={12} md={8} lg={6}>
//                     <Form.Item name="team" label="Team">
//                         <Select mode="multiple" allowClear placeholder="Select Team(s)" showSearch optionFilterProp="children">
//                             {[...teams].sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase())).map(t=><Option key={t.id} value={t.id}>{t.name}</Option>)}
//                         </Select>
//                     </Form.Item>
//                 </Col>




//                 {/* <Col xs={24} sm={12} md={8} lg={6}>
//                     <Form.Item name="status" label="Status">
//                         <Select mode="multiple" allowClear placeholder="Select Status">
//                             {['Done','In Progress','Over Due','To Do'].sort().map(s=><Option key={s} value={s}>{s}</Option>)}
//                         </Select>
//                     </Form.Item>
//                 </Col> */}


//                 <Col xs={24} sm={12} md={8} lg={6}>
//                     <Form.Item name="status" label="Status">
//                         <Select mode="multiple" allowClear placeholder="Select Status">
//                             {[
//                                 'Done', 'In Progress', 'Over Due', 'To Do',
//                                 'wip', 'under_review', 'open', 'closed', 'attention_required'
//                             ].map(s => (
//                                 <Option key={s} value={s}>
//                                     {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
//                                 </Option>
//                             ))}
//                         </Select>
//                     </Form.Item>
//                 </Col>



//                 <Col xs={24} sm={12} md={8} lg={6}>
//                     <Form.Item name="createdBy" label="Created By">
//                         <Select mode="multiple" allowClear showSearch placeholder="Select User(s)" optionFilterProp="children">
//                             {createdByOptions.map(n=><Option key={n} value={n}>{n}</Option>)}
//                         </Select>
//                     </Form.Item>
//                 </Col>
//                 <Col xs={24} sm={12} md={8} lg={6}>
//                     <Form.Item name="due_date" label="Due Date">
//                         <RangePicker style={{width:"100%"}} allowClear/>
//                     </Form.Item>
//                 </Col>
//                 <Col xs={24} style={{textAlign:'right',marginTop:16}}>
//                     <Button onClick={()=>{form.resetFields();onReset();}}>Reset</Button>
//                 </Col>
//             </Row>
//         </Form>
//     );
// };

// // ─────────────────────────────────────────────────────────────
// // JiraBoard — main container
// // ─────────────────────────────────────────────────────────────
// const JiraBoard = ({ statusFilter, clientIdFilter, onBack }) => {
//     const { user }    = useAuth();
//     const location    = useLocation();
//     const navigate    = useNavigate();
//     const { message } = App.useApp();
//     const token       = sessionStorage.getItem('token');

//     const [isLoading, setIsLoading]   = useState(false);
//     const [tasks, setTasks]           = useState([]);          // current page of tasks
//     const [totalCount, setTotalCount] = useState(0);           // total from API (e.g. 5415)
//     // const [filterValues, setFilterValues] = useState({});
//     const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });
//     const [lookups, setLookups]       = useState({ clients:[], spocs:[], subservices:[], teams:[], allEmployees:[], clientGroups:[], mainServices:[] });

//     const getInitialFilters = () => {
//         const q = new URLSearchParams(window.location.search);
//         const filters = {};

//         const status = q.get("status");

//         if (status && status !== "all") {
//             filters.status = [status];
//         }

//         return filters;
//     };

//     const [filterValues, setFilterValues] = useState(getInitialFilters);
//     const showMyTasks = new URLSearchParams(location.search).get("scope") === "my";

//     const [isTaskDetailModalVisible,  setIsTaskDetailModalVisible]  = useState(false);
//     const [isCreateTaskModalVisible,  setIsCreateTaskModalVisible]  = useState(false);
//     const [selectedTask, setSelectedTask] = useState(null);

//     const parseIds = (v) => { if(!v) return []; if(Array.isArray(v)) return v; return v.split(",").map(x=>x.trim()).filter(Boolean); };

//     // ── Build query params from filterValues + pagination ────────────────────
//     // Filters are now sent to the server — no more client-side filtering of 5415 items
//     const buildParams = useCallback(() => {
//         const q = new URLSearchParams(location.search);
//         const scope = q.get("scope") || "all";
//         const params = {
//             scope,
//             page:      pagination.current,
//             page_size: pagination.pageSize,
//         };
//         if (filterValues.task_id)          params.task_id    = filterValues.task_id;
//         if (filterValues.client?.length)   params.client     = filterValues.client.join(",");
//         if (filterValues.subservice?.length) params.sub_service = filterValues.subservice.join(",");
//         if (filterValues.spoc?.length)     params.spoc       = filterValues.spoc.join(",");
//         if (filterValues.team?.length)     params.team       = filterValues.team.join(",");
//         if (filterValues.status?.length)   params.status     = filterValues.status.join(",");
//         if (filterValues.createdBy?.length) params.created_by_name = filterValues.createdBy.join(",");
//         if (filterValues.due_date?.length === 2) {
//             params.due_date_after  = dayjs(filterValues.due_date[0]).format("YYYY-MM-DD");
//             params.due_date_before = dayjs(filterValues.due_date[1]).format("YYYY-MM-DD");
//         }
//         return params;
//     }, [filterValues, pagination, location.search]);

//     // ── Fetch one page of tasks ───────────────────────────────────────────────
//     // Response shape from DRF pagination: { count, next, previous, results }
//     // So 50 rows → response in ~200ms instead of 3300ms for 5415 rows
//     const fetchTasks = useCallback(async () => {
//         if (!token) return;
//         try {
//             const t0  = performance.now();
//             const res = await api.get('/clients/tasks/', { params: buildParams(), headers: { Authorization: `Token ${token}` } });
//             console.log(`✅ API responded in ${(performance.now()-t0).toFixed(0)}ms — page ${pagination.current}, ${res.data.results?.length} tasks (total: ${res.data.count})`);

//             // DRF PageNumberPagination returns { count, results }
//             const results = res.data.results ?? res.data;  // fallback if pagination not yet applied
//             const count   = res.data.count   ?? results.length;
//             setTasks(results);
//             setTotalCount(count);
//         } catch {
//             message.error("Failed to load tasks");
//         }
//     }, [token, buildParams, message]);

//     // ── Fetch lookups once ────────────────────────────────────────────────────
//     const loadLookups = useCallback(async () => {
//         if (!token) return;
//         try { const data = await fetchLookupsOnce(token); setLookups(data); }
//         catch { console.warn("Lookup data failed to load"); }
//     }, [token]);

//     useEffect(() => { loadLookups(); }, [loadLookups]);

//     // Re-fetch whenever page, pageSize, filters, or scope changes
//     useEffect(() => { fetchTasks(); }, [fetchTasks]);

//     // Reset to page 1 when filters change
//     const handleFilterChange = useCallback((vals) => {
//         setFilterValues(vals);
//         setPagination(p => ({ ...p, current: 1 }));
//     }, []);

//     // ── Read URL params on mount ──────────────────────────────────────────────
//     useEffect(() => {
//         const q = new URLSearchParams(location.search);
//         const urlFilters = {};
//         const status      = q.get("status");
//         const startDate   = q.get("start_date");
//         const endDate     = q.get("end_date");
//         const clientIds   = parseIds(q.get("client_id"));
//         const teamIds     = parseIds(q.get("team_id"));
//         const subIds      = parseIds(q.get("sub_service_id"));
//         if (status && status !== "all") urlFilters.status = [status];
//         if (clientIds.length)  urlFilters.client      = clientIds.map(Number);
//         if (teamIds.length)    urlFilters.team        = teamIds.map(Number);
//         if (subIds.length)     urlFilters.subservice  = subIds.map(Number);
//         if (startDate && endDate) urlFilters.due_date = [dayjs(startDate,"YYYY-MM-DD"), dayjs(endDate,"YYYY-MM-DD")];
//         if (statusFilter)     urlFilters.status    = [statusFilter];
//         if (clientIdFilter)   urlFilters.client    = [clientIdFilter];
//         if (Object.keys(urlFilters).length) setFilterValues(urlFilters);
//     }, []);

//     const toggleScope = () => {
//         const q = new URLSearchParams(location.search);
//         q.set("scope", showMyTasks ? "all" : "my");
//         navigate(`${location.pathname}?${q.toString()}`);
//         setPagination(p => ({ ...p, current: 1 }));
//     };

//     const handleTaskClick = (taskId) => {
//         setSelectedTask(tasks.find(t => t.id === taskId) || null);
//         setIsTaskDetailModalVisible(true);
//     };

//     const refreshDashboard = useCallback(() => { fetchTasks(); }, [fetchTasks]);

//     const employeeNameMap = useMemo(() => {
//         const map = {};
//         (lookups.allEmployees || []).forEach(emp => {
//             map[emp.user_id] = emp.user?.full_name || `${emp.first_name||""} ${emp.last_name||""}`.trim();
//         });
//         return map;
//     }, [lookups.allEmployees]);

//     const getAssignedNames = (task) =>
//         (task.assigned_user_ids || []).map(id => employeeNameMap[id] || `User ${id}`).join(", ") || "Not assigned";

//     const exportToExcel = async (fileNamePrefix, currentPageOnly = false) => {
//         message.loading({ content: 'Preparing export...', key: 'export' });
//         try {
//             let allTasks;

//             if (currentPageOnly) {
//                 // ── Current page: use already-loaded tasks, no API call needed ──
//                 allTasks = tasks;
//             } else {
//                 // ── Download All: fetch all matching records without pagination ──
//                 const { page, page_size, ...exportParams } = buildParams();
//                 const res = await api.get('/clients/tasks/export', {
//                     params: { ...exportParams, page: 1, page_size: 99999 },
//                     headers: { Authorization: `Token ${token}` },
//                 });
//                 allTasks = res.data.results ?? res.data;
//             }

//             const headers = ['Sl No','Task ID','Date','Client','Description','SPOC','Assigned To','Team','Period','Due Date','Status','Created By','Total Hours'];
//             // const data = allTasks.map((task, i) => [
//             //     i+1, task.task_id, moment(task.created_at).format('DD-MM-YYYY'),
//             //     task.client_name||'N/A', task.sub_service_name||'N/A', task.spoc_name||'N/A', task.team_name||'N/A',
//             //     task.period||'N/A', moment(task.due_date).format('YYYY-MM-DD'),
//             //     task.status, task.created_by_name||'System',
//             //     formatDurationFromMillis((task.total_hours||0)*3600*1000),
//             // ]);

//             const data = allTasks.map((task, i) => [
//                 i+1, task.task_id, moment(task.created_at).format('DD-MM-YYYY'),
//                 task.client_name||'N/A', task.sub_service_name||'N/A', task.spoc_name||'N/A', getAssignedNames(task), task.team_name||'N/A',
//                 task.period||'N/A', moment(task.due_date).format('YYYY-MM-DD'),
//                 task.status, task.created_by_name||'System',
//                 formatDurationFromMillis((task.total_hours||0)*3600*1000),
//             ]);

//             const allData = [headers, ...data];
//             const ws      = XLSX.utils.aoa_to_sheet(allData);
//             const hStyle  = { font:{bold:true,color:{rgb:"FFFFFF"}}, fill:{fgColor:{rgb:"01263a"}}, border:{top:{style:"thin"},right:{style:"thin"},bottom:{style:"thin"},left:{style:"thin"}} };
//             const cStyle  = { border:{top:{style:"thin"},right:{style:"thin"},bottom:{style:"thin"},left:{style:"thin"}} };
//             const range   = XLSX.utils.decode_range(ws['!ref']);
//             for (let R=range.s.r; R<=range.e.r; ++R)
//                 for (let C=range.s.c; C<=range.e.c; ++C) {
//                     const ref = XLSX.utils.encode_cell({r:R,c:C});
//                     if (ws[ref]) ws[ref].s = R===0 ? hStyle : cStyle;
//                 }
//             const wb = XLSX.utils.book_new();
//             XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
//             XLSX.writeFile(wb, `${(user?.full_name||'exported').replace(/\s/g,'_')}_${fileNamePrefix}_${moment().format('YYYY-MM-DD')}.xlsx`);
//             message.success({ content: `Exported ${allTasks.length} records`, key: 'export' });
//         } catch {
//             message.error({ content: 'Export failed', key: 'export' });
//         }
//     };

//     // ── Update menu handler to pass the flag ──
//     const handleMenuClick = ({ key }) => {
//         if (key === 'all')     exportToExcel('all_tasks',          false);
//         if (key === 'current') exportToExcel(`page_${pagination.current}_tasks`, true);
//     };

//     const downloadMenu = <Menu onClick={handleMenuClick} items={[{ key:"all", label:"Download All" }, { key:"current", label:"Download Current Page" }]}/>;

//     useEffect(() => {
//         const handler = (e) => {
//             if (['input','textarea'].includes(e.target.tagName.toLowerCase())) return;
//             if (e.ctrlKey && e.key === 'r') { e.preventDefault(); refreshDashboard(); }
//         };
//         window.addEventListener('keydown', handler);
//         return () => window.removeEventListener('keydown', handler);
//     }, [refreshDashboard]);

//     return (
//         <App>
//             <div style={{padding:'24px',background:'linear-gradient(to right, #f8f9fa, #e0e7ff)',borderRadius:'12px',boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}}>
//                 <Row justify="space-between" align="middle" style={{marginBottom:'24px'}}>
//                     <Col>
//                         <Title level={2} style={{margin:0}}>
//                             {clientIdFilter ? `Tasks for ${lookups.clients.find(c=>c.id===clientIdFilter)?.name||'Client'}` : 'STT Record'}
//                         </Title>
//                     </Col>
//                     <Col>
//                         <Space>
//                             {clientIdFilter && <Button icon={<LeftOutlined/>} onClick={onBack}>Back to Dashboard</Button>}
//                             {user?.role==='Admin' && <CreateMonthlyTasksButton/>}
//                             <Button icon={<PlusOutlined/>} onClick={()=>setIsCreateTaskModalVisible(true)}>Create New Task</Button>
//                             <Dropdown overlay={downloadMenu} trigger={['click']}><Button icon={<DownloadOutlined/>}>Download</Button></Dropdown>
//                             <Button style={{minWidth:120}} icon={showMyTasks?<TeamOutlined/>:<UserOutlined/>} onClick={toggleScope}>{showMyTasks?"All Tasks":"My Tasks"}</Button>
//                             <Button type="default" icon={<ReloadOutlined/>} onClick={refreshDashboard}>Refresh</Button>
//                         </Space>
//                     </Col>
//                 </Row>

//                 <Collapse items={[{ key:'1', label:<div style={{fontSize:'19px',fontWeight:'bold'}}><FilterOutlined style={{fontSize:'19px',marginRight:'8px'}}/>Filters</div>, children:(
//                     <FilterForm
//                         clients={lookups.clients} subservices={lookups.subservices} spocs={lookups.spocs} teams={lookups.teams} tasks={tasks}
//                         onFilter={handleFilterChange}
//                         onReset={()=>{ setFilterValues(clientIdFilter?{client:[clientIdFilter]}:{}); setPagination(p=>({...p,current:1})); }}
//                         initialValues={filterValues}
//                         isClientFilterDisabled={!!clientIdFilter}
//                     />
//                 )}]} bordered={false} style={{marginBottom:'24px'}}/>

//                 <TaskTableView
//                     tasks={tasks}
//                     pagination={pagination}
//                     setPagination={setPagination}
//                     onTaskClick={handleTaskClick}
//                     // loading={isLoading}
//                     totalCount={totalCount}
//                     allEmployees={lookups.allEmployees}
//                 />

//                 <TaskDetailView
//                     visible={isTaskDetailModalVisible}
//                     taskId={selectedTask?.id}
//                     onClose={()=>{ setIsTaskDetailModalVisible(false); setSelectedTask(null); }}
//                     onTaskUpdated={refreshDashboard}
//                     allEmployees={lookups.allEmployees}
//                 />

//                 <CreateTaskModal
//                     visible={isCreateTaskModalVisible}
//                     onClose={()=>setIsCreateTaskModalVisible(false)}
//                     clients={lookups.clients} clientGroups={lookups.clientGroups}
//                     mainServices={lookups.mainServices} spocs={lookups.spocs}
//                     subservices={lookups.subservices} teams={lookups.teams}
//                     allEmployees={lookups.allEmployees}
//                     onTaskCreated={refreshDashboard}
//                 />
//             </div>
//         </App>
//     );
// };

// export { TaskDetailView };
// export default JiraBoard;






















import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
    Typography, Card, Row, Col, Space, Button, Form, Select, Input,
    DatePicker, Tag, Descriptions,
    App, Collapse, message, Menu, Dropdown, Tooltip, Upload, Checkbox,
    Timeline, Popconfirm, Progress,
} from 'antd';
import Modal from '../../../components/Modal';
import Table from '../../../components/Table';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
    PlusOutlined, UserOutlined, TeamOutlined, CalendarOutlined, SearchOutlined,
    MinusCircleOutlined, ClockCircleOutlined, CheckCircleOutlined,
    FilterOutlined, DownloadOutlined, LeftOutlined, ReloadOutlined,
    DeleteOutlined, PlusCircleOutlined, UserAddOutlined, FileTextOutlined,
    HistoryOutlined, EditOutlined, SaveOutlined, StopOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';
import CreateMonthlyTasksButton from './CreateMonthlyTasksButton';
import moment from 'moment';
import { UploadOutlined } from "@ant-design/icons";
import { SpinnerContext } from '../../../components/SpinnerContext';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import axios from "axios";

dayjs.extend(customParseFormat);

// ─────────────────────────────────────────────────────────────
// Constants & tiny helpers
// ─────────────────────────────────────────────────────────────
const CAN_ASSIGN_ROLES = ["manager", "team lead", "admin", "founder"];
const MAX_ASSIGN       = 3;
const canAssignTask    = (user) => CAN_ASSIGN_ROLES.includes(user?.role?.toLowerCase());
const canEditDueDate   = (user) => ["admin", "founder"].includes(user?.role?.toLowerCase());
const canEditStatus    = (user) => ["admin", "founder"].includes(user?.role?.toLowerCase());
const canCompleteTask  = (user) => CAN_ASSIGN_ROLES.includes(user?.role?.toLowerCase());

// Recurring Task can only be offered for period types that have a real
// automatic-recurrence equivalent server-side (create_monthly_tasks only
// understands Monthly / Quarterly / Half-Yearly / Annually).
const RECURRING_PERIOD_TYPES = ['monthly', 'quarterly', 'half_yearly', 'annually'];

const getEmployeeDisplayName = (emp) =>
    emp?.name || emp?.user?.full_name || emp?.full_name || `${emp?.first_name || ""} ${emp?.last_name || ""}`.trim();

// ── Smart Start Time suggestion for "Add Time Entry" ────────────────────
// If the employee has already logged time today, the next entry picks up
// where the last one left off (latest end_time + 1 minute). Otherwise it
// suggests today's check-in time. Every lookup is wrapped in try/catch, so
// if an endpoint isn't available the button simply adds an empty row.
async function suggestTaskTimeEntryStart() {
    const today = dayjs().format("YYYY-MM-DD");

    try {
        const res = await api.get("/clients/my-work-history/", {
            params: { start_date: today, end_date: today },
        });
        const rows = Array.isArray(res.data) ? res.data : [];
        const endTimes = rows.map(r => r.end_time).filter(Boolean).map(t => dayjs(t));
        if (endTimes.length) {
            const latestEnd = endTimes.reduce((a, b) => (b.isAfter(a) ? b : a));
            return latestEnd.add(1, "minute");
        }
    } catch (err) {
        console.error("Failed to load today's work history for start-time suggestion", err);
    }

    try {
        const now = dayjs();
        const res = await api.get("/employee/attendances/", {
            params: { month: now.month() + 1, year: now.year() },
        });
        const rows = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        const todaysAttendance = rows.find(r => r.date && dayjs(r.date).isSame(now, "day"));
        if (todaysAttendance?.check_in_time) {
            return dayjs(todaysAttendance.check_in_time);
        }
    } catch (err) {
        console.error("Failed to load today's attendance for start-time suggestion", err);
    }

    return null;
}

const { Title, Text } = Typography;
const { Option }      = Select;
const { RangePicker } = DatePicker;

const downloadFileHelper = async (url, filename, msgApi) => {
    try {
        const response = await axios.get(url, { responseType: "blob", headers: { Accept: "*/*" } });
        const blob        = new Blob([response.data]);
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl; a.download = filename;
        document.body.appendChild(a); a.click();
        a.remove(); window.URL.revokeObjectURL(downloadUrl);
    } catch { msgApi.error("File download failed"); }
};

const calculateTotalMillisFromTimeEntries = (timeEntries = []) => {
    let ms = 0;
    timeEntries.forEach(e => {
        if (e.start_time && e.end_time) {
            const diff = moment(e.end_time).diff(moment(e.start_time));
            if (diff > 0) ms += diff;
        }
    });
    return ms;
};

export const formatDurationFromMillis = (ms) => {
    if (!ms || isNaN(ms)) return "0m";
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60), m = totalMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ── Status colours: STT statuses + legal-service statuses ───────────────
const STATUS_COLOR = {
    'To Do': 'purple',
    'In Progress': 'yellow',
    'Done': 'green',
    'Over Due': 'red',
    'wip': 'orange',
    'under_review': 'geekblue',
    'attention_required': 'volcano',
    'open': 'cyan',
    'closed': 'success',
};

// "In Progress" needs its TEXT to read #b7a15f specifically, without
// changing the tag's background/border — this className overrides just the
// text colour on top of the normal "yellow" preset.
const statusTagClassName = (status) => (status === 'In Progress' ? 'status-tag-inprogress-text' : undefined);

const getEffectiveTaskStatus = (task) => {
    if (!task) return 'Loading...';

    // A linked legal job (MCA / TDS / Income Tax litigation) overrides the STT status
    if (task.legal_status) return task.legal_status;

    // Standard STT logic fallback
    if (task.status === 'Done') return 'Done';
    if (task.due_date && moment(task.due_date).isBefore(moment(), 'day')) return 'Over Due';
    return task.status;
};

// 'attention_required' -> 'ATTENTION REQUIRED'
const formatStatusLabel = (status) => String(status || '').replace(/_/g, ' ').toUpperCase();

// ─────────────────────────────────────────────────────────────
// Lookup cache — fetched once per session
// ─────────────────────────────────────────────────────────────
const _lookupCache = { data: null, promise: null };

// Helper to extract array from paginated or plain response
const toArray = (data) => Array.isArray(data) ? data : (data?.results || []);

async function fetchLookupsOnce(token) {
    if (_lookupCache.data)    return _lookupCache.data;
    if (_lookupCache.promise) return _lookupCache.promise;

    const headers = { Authorization: `Token ${token}` };

    _lookupCache.promise = Promise.all([
        api.get('/clients/clients-lite/',  { headers }),   // lite endpoint for dropdowns
        api.get('/clients/spocs/',         { headers }),
        api.get('/clients/subservices/',   { headers }),
        api.get('/employee/teams/',        { headers }),
        api.get('/employee/employees/',    { headers }),
        api.get('/clients/client-groups/', { headers }),
        api.get('/clients/mainservices/',  { headers }),
    ]).then(([c, sp, sub, t, emp, g, ms]) => {
        _lookupCache.data = {
            clients:      toArray(c.data),
            spocs:        toArray(sp.data),
            subservices:  toArray(sub.data),
            teams:        toArray(t.data),
            allEmployees: toArray(emp.data),
            clientGroups: toArray(g.data),
            mainServices: toArray(ms.data),
        };
        _lookupCache.promise = null;
        return _lookupCache.data;
    });
    return _lookupCache.promise;
}

export function invalidateLookupCache() { _lookupCache.data = null; _lookupCache.promise = null; }

// ─────────────────────────────────────────────────────────────
// CreateTaskModal
// ─────────────────────────────────────────────────────────────
const CreateTaskModal = ({ visible, onClose, onTaskCreated, allEmployees = [], clients = [], spocs = [], subservices = [], teams = [], clientGroups = [], mainServices = [] }) => {
    const [form]              = Form.useForm();
    const { user }            = useAuth();
    const [periodType, setPeriodType]             = useState(null);
    const [periodStartDate, setPeriodStartDate]   = useState(null);
    const [customStartDate, setCustomStartDate]   = useState(null);
    const [customEndDate, setCustomEndDate]       = useState(null);
    const [uploadEnabled, setUploadEnabled]       = useState(false);
    const [isRecurring, setIsRecurring]           = useState(false);
    const [selectedUserIds, setSelectedUserIds]   = useState([]);

    useEffect(() => {
        if (!visible) return;
        form.resetFields(); setUploadEnabled(false); setPeriodType(null);
        setPeriodStartDate(null); setCustomStartDate(null); setCustomEndDate(null);
        setSelectedUserIds([]); setIsRecurring(false);
    }, [visible, form]);

    const handleClientChange = (clientId) => {
        form.resetFields(['spoc']);
        const grp = clientGroups.find(g => g.clients.some(c => c.id === clientId));
        if (grp?.primary_spoc) form.setFieldsValue({ spoc: grp.primary_spoc });
        else message.info('No primary SPOC found for this client group.');
    };

    const handleSubServiceChange = (id) => {
        const sub = subservices.find(s => s.id === id);
        if (!sub?.main_service) { form.setFieldsValue({ team: null }); return; }
        const ms = mainServices.find(m => m.id === sub.main_service);
        form.setFieldsValue({ team: ms?.team || null });
    };

    const getPeriodEndDate = () => {
        if (!periodStartDate || !periodType) return null;
        const map = { monthly: [0,'month'], quarterly: [2,'month'], half_yearly: [5,'month'], annually: [11,'month'] };
        const [n, unit] = map[periodType] || [];
        return n !== undefined ? periodStartDate.clone().add(n, unit).endOf('month') : null;
    };

    const getPeriodString = () => {
        if (periodType === "not_applicable") return "NA";
        if (periodType === "custom") { if (!customStartDate || !customEndDate) return null; return `${customStartDate.format("DD MMM YYYY")} to ${customEndDate.format("DD MMM YYYY")}`; }
        if (!periodType || !periodStartDate) return null;
        const start = periodStartDate.format("MMM-YYYY");
        if (periodType === "monthly") return start;
        return `${start} to ${getPeriodEndDate()?.format("MMM-YYYY")}`;
    };

    const onFinish = async (values) => {
        const periodString = getPeriodString();
        try {
            const fd = new FormData();
            fd.append("client",      values.client);
            fd.append("sub_service", values.sub_service);

            // spoc and team are auto-filled from the client / description
            const spocVal = form.getFieldValue('spoc');
            const teamVal = form.getFieldValue('team');
            if (spocVal) fd.append("spoc", spocVal);
            if (teamVal) fd.append("team", teamVal);

            fd.append("due_date", values.due_date?.format("YYYY-MM-DD"));
            fd.append("period",   periodType === 'not_applicable' ? "NA" : (periodString || ""));

            if (isRecurring && RECURRING_PERIOD_TYPES.includes(periodType)) {
                fd.append("is_recurring", "true");
                fd.append("period_type", periodType);
            }

            // Only append assigned_users if there are any
            selectedUserIds.forEach(uid => fd.append("assigned_users", uid));

            if (values.file?.[0]?.originFileObj) {
                fd.append("file", values.file[0].originFileObj);
            }

            await api.post("/clients/tasks/", fd);
            message.success("Task created successfully!");
            form.resetFields(); onTaskCreated(); onClose();
        } catch (error) {
            const data = error?.response?.data;
            if (data?.non_field_errors?.length) message.error(data.non_field_errors[0]);
            else if (data?.detail) message.error(data.detail);
            else message.error("Failed to create task.");
        }
    };

    return (
        <Modal
            title="Create New Task"
            isOpen={visible}
            onClose={onClose}
            size="lg"
            footer={
                <>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => form.submit()}>Create</button>
                </>
            }
        >
            <Form form={form} layout="vertical" onFinish={onFinish}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="client" label="Client Name" rules={[{ required: true }]}>
                            <Select showSearch onChange={handleClientChange} placeholder="Select Client" allowClear optionFilterProp="children">
                                {clients.map(c => <Option key={c.id} value={c.id}>{c.group_name ? `${c.group_name} – ${c.name}` : c.name}</Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="sub_service" label="Description" rules={[{ required: true }]}>
                            <Select showSearch onChange={handleSubServiceChange} placeholder="Select a Description" allowClear optionFilterProp="children">
                                {subservices.filter(s => (s.team_name || "").toLowerCase() !== "general").map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="due_date"
                            label="Due Date"
                            rules={[{ required: true }]}
                            extra="Must be within the next 30 days"
                        >
                            <DatePicker
                                style={{ width: '100%' }}
                                disabledDate={(c) => c && (c < dayjs().startOf('day') || c > dayjs().add(30, 'day').endOf('day'))}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="period_type" label="Period Type" rules={[{ required: true }]}>
                            <Select placeholder="Select Period Type" onChange={(v) => { setPeriodType(v); form.setFieldsValue({ period_start_date: null }); setPeriodStartDate(null); if (!RECURRING_PERIOD_TYPES.includes(v)) setIsRecurring(false); }}>
                                {['monthly','quarterly','half_yearly','annually','custom','not_applicable'].map(v => <Option key={v} value={v}>{v.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    {periodType && !["not_applicable","custom"].includes(periodType) && (
                        <Col span={12}>
                            <Form.Item name="period_start_date" label="Period Start Date" rules={[{ required: true }]}>
                                <DatePicker picker="month" format="MMM-YYYY" style={{ width: "100%" }} onChange={setPeriodStartDate} />
                            </Form.Item>
                        </Col>
                    )}
                    {periodType && ["quarterly","half_yearly","annually"].includes(periodType) && (
                        <Col span={12}><Form.Item label="Period End Date"><Input value={getPeriodEndDate()?.format("MMM-YYYY") || ""} readOnly /></Form.Item></Col>
                    )}
                    {periodType === "custom" && (<>
                        <Col span={12}><Form.Item label="Period Start Date"><DatePicker style={{ width: "100%" }} onChange={setCustomStartDate} /></Form.Item></Col>
                        <Col span={12}><Form.Item label="Period End Date"><DatePicker style={{ width: "100%" }} disabledDate={c => customStartDate && c.isBefore(customStartDate.startOf("day"))} onChange={setCustomEndDate} /></Form.Item></Col>
                    </>)}
                </Row>
                {canAssignTask(user) && (
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item label="Assign To (Optional)">
                                <Select mode="multiple" showSearch optionFilterProp="children" value={selectedUserIds} style={{ width: "100%" }} placeholder="Assign employees (max 3)" allowClear maxTagCount={3}
                                    onChange={(vals) => { if (vals.length > MAX_ASSIGN) { message.warning("Only 3 employees allowed"); return; } setSelectedUserIds(vals); }}>
                                    {(allEmployees || []).map(emp => <Select.Option key={emp.user_id} value={emp.user_id} disabled={selectedUserIds.length >= MAX_ASSIGN && !selectedUserIds.includes(emp.user_id)}>{emp.user?.full_name || `${emp.first_name||""} ${emp.last_name||""}`.trim()}</Select.Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                )}
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label=""><Checkbox checked={uploadEnabled} onChange={e => setUploadEnabled(e.target.checked)}>Upload Related File</Checkbox></Form.Item>
                        {uploadEnabled && (
                            <Form.Item name="file" valuePropName="fileList" getValueFromEvent={e => Array.isArray(e) ? e : e?.fileList}>
                                <Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>Select File</Button></Upload>
                            </Form.Item>
                        )}
                    </Col>
                    <Col span={12}>
                        <Form.Item label="">
                            <Checkbox
                                checked={isRecurring}
                                disabled={!RECURRING_PERIOD_TYPES.includes(periodType)}
                                onChange={e => setIsRecurring(e.target.checked)}
                            >
                                Recurring Task
                            </Checkbox>
                            {!RECURRING_PERIOD_TYPES.includes(periodType) && (
                                <div style={{ fontSize: 12, color: "var(--color-slate-400)", marginTop: 2 }}>
                                    Only available for Monthly, Quarterly, Half-Yearly, or Annually period types.
                                </div>
                            )}
                            {isRecurring && (
                                <div style={{ fontSize: 12, color: "var(--color-slate-400)", marginTop: 2 }}>
                                    Adds this client/service to the recurring services list — future periods generate automatically using this task's Due Date (day/month).
                                </div>
                            )}
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};

// ─────────────────────────────────────────────────────────────
// BulkUploadTaskModal — upload an Excel sheet to create many tasks at once
// ─────────────────────────────────────────────────────────────
const BULK_TEMPLATE_HEADERS = [
    'Client Name', 'Description', 'Due Date', 'Period',
    'SPOC Name', 'Team Name', 'Assigned To',
];

const downloadBulkTemplate = () => {
    const sample = [
        ['Acme Corp', 'Monthly Bookkeeping', '31-07-2026', 'Jul-2026', '', '', 'John Doe'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([BULK_TEMPLATE_HEADERS, ...sample]);
    ws['!cols'] = BULK_TEMPLATE_HEADERS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, 'bulk_task_upload_template.xlsx');
};

const normalize = (s) => (s || '').toString().trim().toLowerCase();

const parseExcelDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return dayjs(val);
    if (typeof val === 'number') {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed) return dayjs(new Date(parsed.y, parsed.m - 1, parsed.d));
    }
    const str = val.toString().trim();
    const formats = ['DD-MM-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD MMM YYYY'];
    for (const f of formats) {
        const d = dayjs(str, f, true);
        if (d.isValid()) return d;
    }
    const fallback = dayjs(str);
    return fallback.isValid() ? fallback : null;
};

const BulkUploadTaskModal = ({
    visible, onClose, onTasksCreated,
    clients = [], subservices = [], teams = [], spocs = [],
    clientGroups = [], mainServices = [], allEmployees = [],
}) => {
    const { user }                    = useAuth();
    const { message }                 = App.useApp();
    const [parsedRows, setParsedRows] = useState([]);
    const [fileName, setFileName]     = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress]     = useState({ done: 0, total: 0 });
    const [results, setResults]       = useState(null); // { success, failed: [] }

    const userCanAssign = canAssignTask(user);

    const reset = () => { setParsedRows([]); setFileName(null); setResults(null); setProgress({ done: 0, total: 0 }); };
    useEffect(() => { if (!visible) reset(); }, [visible]);

    const resolveClient = (name) => {
        if (!name) return null;
        const n = normalize(name);
        return clients.find(c =>
            normalize(c.name) === n ||
            normalize(`${c.group_name || ''} – ${c.name}`) === n ||
            normalize(`${c.group_name || ''} - ${c.name}`) === n
        ) || null;
    };
    const resolveSubService = (name) => {
        if (!name) return null;
        const n = normalize(name);
        return subservices.find(s => normalize(s.name) === n) || null;
    };
    const resolveTeam = (name) => {
        if (!name) return null;
        const n = normalize(name);
        return teams.find(t => normalize(t.name) === n) || null;
    };
    const resolveSpocByName = (name) => {
        if (!name) return null;
        const n = normalize(name);
        return spocs.find(s => normalize(s.name) === n) || null;
    };
    const resolveGroupSpoc = (clientId) => {
        const grp = clientGroups.find(g => (g.clients || []).some(c => c.id === clientId));
        return grp?.primary_spoc || null;
    };
    const resolveAssignedUsers = (namesStr) => {
        if (!namesStr || !userCanAssign) return [];
        const names = namesStr.split(/[,;]/).map(s => normalize(s)).filter(Boolean);
        const ids = [];
        names.forEach(n => {
            const emp = allEmployees.find(e =>
                normalize(e.user?.full_name || `${e.first_name || ''} ${e.last_name || ''}`) === n
            );
            if (emp) ids.push(emp.user_id);
        });
        return ids.slice(0, MAX_ASSIGN);
    };

    const handleFile = async (file) => {
        setFileName(file.name);
        try {
            const buf  = await file.arrayBuffer();
            const wb   = XLSX.read(buf, { type: 'array', cellDates: true });
            const ws   = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

            const resolved = rows.map((r, idx) => {
                const clientName  = r['Client Name'] || r['Client'] || '';
                const subName     = r['Description'] || r['Sub Service'] || '';
                const dueRaw      = r['Due Date'] || '';
                const period      = (r['Period'] || '').toString().trim() || 'NA';
                const spocName    = r['SPOC Name'] || r['SPOC'] || '';
                const teamName    = r['Team Name'] || r['Team'] || '';
                const assignedRaw = r['Assigned To'] || '';

                const errors = [];
                const client = resolveClient(clientName);
                if (!clientName) errors.push('Client Name is required');
                else if (!client) errors.push(`Client "${clientName}" not found`);

                const subService = resolveSubService(subName);
                if (!subName) errors.push('Description is required');
                else if (!subService) errors.push(`Description "${subName}" not found`);

                const dueDate = parseExcelDate(dueRaw);
                if (!dueRaw) errors.push('Due Date is required');
                else if (!dueDate) errors.push(`Due Date "${dueRaw}" could not be parsed`);

                let team = teamName ? resolveTeam(teamName) : null;
                if (!team && subService) {
                    const ms = mainServices.find(m => m.id === subService.main_service);
                    team = teams.find(t => t.id === ms?.team) || null;
                }
                if (teamName && !team) errors.push(`Team "${teamName}" not found`);
                // Team is a required, non-nullable field on the backend Task model —
                // if it couldn't be typed or auto-derived from the Description, block the row.
                else if (!team) errors.push('Team could not be determined (not found in Description\'s main service — please specify Team Name)');

                let spocId = null;
                const spocMatch = resolveSpocByName(spocName);
                if (spocMatch) spocId = spocMatch.id;
                else if (client) spocId = resolveGroupSpoc(client.id);
                if (!spocId) errors.push('SPOC could not be determined');

                const assignedUserIds = resolveAssignedUsers(assignedRaw);
                if (assignedRaw && userCanAssign && assignedUserIds.length === 0) {
                    errors.push(`No matching employees found for "${assignedRaw}"`);
                }

                return {
                    key: idx, raw: r,
                    clientName, subName, period, teamName, spocName, assignedRaw,
                    client, subService, dueDate, team, spocId, assignedUserIds,
                    errors, valid: errors.length === 0,
                };
            });
            setParsedRows(resolved);
        } catch (e) {
            message.error('Failed to parse Excel file. Please check the format.');
        }
        return false; // prevent antd auto-upload
    };

    const validRows   = parsedRows.filter(r => r.valid);
    const invalidRows = parsedRows.filter(r => !r.valid);

    const handleCreateAll = async () => {
        if (!validRows.length) return;
        setSubmitting(true);
        setProgress({ done: 0, total: validRows.length });
        const failed = [];
        let successCount = 0;

        for (const row of validRows) {
            try {
                const fd = new FormData();
                fd.append('client', row.client.id);
                fd.append('sub_service', row.subService.id);
                fd.append('spoc', row.spocId);
                fd.append('team', row.team?.id || '');
                fd.append('due_date', row.dueDate.format('YYYY-MM-DD'));
                fd.append('period', row.period);
                row.assignedUserIds.forEach(uid => fd.append('assigned_users', uid));
                await api.post('/clients/tasks/', fd);
                successCount++;
            } catch (err) {
                const data = err?.response?.data;
                const msg  = data?.non_field_errors?.[0] || data?.detail || 'Failed to create task';
                failed.push({ ...row, error: msg });
            }
            setProgress(p => ({ ...p, done: p.done + 1 }));
        }

        setSubmitting(false);
        setResults({ success: successCount, failed });
        if (successCount) onTasksCreated();
    };

    const downloadFailedRows = () => {
        if (!results?.failed?.length) return;
        const headers = [...BULK_TEMPLATE_HEADERS, 'Error'];
        const data = results.failed.map(r => [
            r.clientName, r.subName,
            r.dueDate ? r.dueDate.format('DD-MM-YYYY') : r.raw['Due Date'],
            r.period, r.spocName, r.teamName, r.assignedRaw, r.error,
        ]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Failed Rows');
        XLSX.writeFile(wb, `bulk_upload_failed_rows_${moment().format('YYYY-MM-DD_HHmm')}.xlsx`);
    };

    const previewColumns = [
        { key: 'idx', label: '#', render: (_row, absoluteIndex) => absoluteIndex + 1 },
        { key: 'status', label: 'Status', render: (r) => r.valid ? <Tag color="green">Valid</Tag> : <Tag color="red">Error</Tag> },
        { key: 'clientName', label: 'Client', render: (r) => r.clientName },
        { key: 'subName', label: 'Description', render: (r) => r.subName },
        { key: 'due', label: 'Due Date', render: (r) => r.dueDate ? r.dueDate.format('DD MMM YYYY') : (r.raw['Due Date'] || '-') },
        { key: 'period', label: 'Period', render: (r) => r.period },
        { key: 'team', label: 'Team', render: (r) => r.team?.name || r.teamName || '-' },
        { key: 'assignedRaw', label: 'Assigned', render: (r) => r.assignedRaw || '-' },
        { key: 'errors', label: 'Errors', render: (r) => r.errors.length ? <Text type="danger" style={{ fontSize: 12 }}>{r.errors.join('; ')}</Text> : '-' },
    ];

    return (
        <Modal
            title="Bulk Upload Tasks (STT) from Excel"
            isOpen={visible}
            onClose={onClose}
            size="lg"
            footer={
                results ? (
                    <>
                        {results.failed.length > 0 && <button className="btn btn-danger" onClick={downloadFailedRows}>Download Failed Rows</button>}
                        <button className="btn btn-primary" onClick={onClose}>Done</button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-secondary" onClick={downloadBulkTemplate}>Download Template</button>
                        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button
                            className="btn btn-primary"
                            disabled={!validRows.length || submitting}
                            onClick={handleCreateAll}
                        >
                            {submitting ? 'Creating…' : `Create ${validRows.length ? `${validRows.length} ` : ''}Task${validRows.length === 1 ? '' : 's'}`}
                        </button>
                    </>
                )
            }
        >
            {!results && (
                <>
                    <Upload.Dragger accept=".xlsx,.xls" maxCount={1} beforeUpload={handleFile} showUploadList={false}>
                        <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                        <p>Click or drag an Excel file here to upload</p>
                        {fileName && <p style={{ color: 'var(--color-primary)' }}>{fileName} — {parsedRows.length} rows parsed</p>}
                    </Upload.Dragger>
                    <div style={{ margin: '12px 0' }}>
                        <Text type="secondary">
                            Columns: Client Name, Description, Due Date, Period, SPOC Name (optional),
                            Team Name (usually auto-detected from Description, but required if it can't be){userCanAssign ? ', Assigned To (optional, comma-separated names)' : ''}.{' '}
                            <a onClick={downloadBulkTemplate}>Download the template</a>.
                        </Text>
                    </div>
                    {parsedRows.length > 0 && (
                        <>
                            <Space style={{ marginBottom: 8 }}>
                                <Tag color="green">{validRows.length} valid</Tag>
                                {invalidRows.length > 0 && <Tag color="red">{invalidRows.length} with errors</Tag>}
                            </Space>
                            <Table
                                rows={parsedRows} columns={previewColumns} getRowId={(row) => row.key}
                                pageSize={10}
                            />
                        </>
                    )}
                    {submitting && (
                        <div style={{ marginTop: 16 }}>
                            <Progress percent={Math.round((progress.done / progress.total) * 100)} />
                            <Text type="secondary">Creating tasks: {progress.done} / {progress.total}</Text>
                        </div>
                    )}
                </>
            )}
            {results && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <CheckCircleOutlined style={{ fontSize: 48, color: results.failed.length ? 'var(--color-warning)' : 'var(--color-success)' }} />
                    <Title level={4} style={{ marginTop: 16 }}>
                        {results.success} task{results.success === 1 ? '' : 's'} created successfully
                    </Title>
                    {results.failed.length > 0 && (
                        <>
                            <Text type="danger">{results.failed.length} row(s) failed</Text>
                            <Table
                                rows={results.failed} getRowId={(row) => row.key}
                                pageSize={5}
                                columns={[
                                    { key: 'clientName', label: 'Client', render: (r) => r.clientName },
                                    { key: 'subName', label: 'Description', render: (r) => r.subName },
                                    { key: 'error', label: 'Error', render: (r) => <Text type="danger">{r.error}</Text> },
                                ]}
                            />
                        </>
                    )}
                </div>
            )}
        </Modal>
    );
};

// ─────────────────────────────────────────────────────────────
// TaskDetailView
// ─────────────────────────────────────────────────────────────
const TaskDetailView = ({ visible, taskId, onClose, onTaskUpdated, allEmployees }) => {
    const [isSaving, setIsSaving]                 = useState(false);
    const [form]                                  = Form.useForm();
    const { user }                                = useAuth();
    const { message }                             = App.useApp();
    const { showSpinner, hideSpinner }            = useContext(SpinnerContext);
    const [task, setTask]                         = useState(null);
    const [isLoading, setIsLoading]               = useState(false);
    const [error, setError]                       = useState(null);
    const [proofNotRequired, setProofNotRequired] = useState(false);
    const [selectedUserIds, setSelectedUserIds]   = useState([]);
    const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
    const [history, setHistory]                   = useState([]);
    const [historyVisible, setHistoryVisible]     = useState(false);
    const [editingEntryId, setEditingEntryId]     = useState(null);
    const [editEntryForm, setEditEntryForm]       = useState({});
    const [savingEntry, setSavingEntry]           = useState(false);
    const [isEditingDueDate, setIsEditingDueDate] = useState(false);
    const [newDueDate, setNewDueDate]             = useState(null);
    const [savingDueDate, setSavingDueDate]       = useState(false);
    const [isEditingStatus, setIsEditingStatus]   = useState(false);
    const [newStatus, setNewStatus]               = useState(null);
    const [savingStatus, setSavingStatus]         = useState(false);

    const isToday         = (s) => s && dayjs(s).isSame(dayjs(), "day");
    const effectiveStatus = useMemo(() => getEffectiveTaskStatus(task), [task]);
    const hasTimeEntries  = (task?.time_entries?.length || 0) > 0;
    const hasProof        = !!task?.proof_file;
    const canCompleteTaskCheck = hasTimeEntries && (hasProof || proofNotRequired);
    const isTaskDone      = task?.status === 'Done';

    const activeAssignments = (task?.assignments || []).filter(a => a.is_active);

    useEffect(() => { if (visible) { setProofNotRequired(false); setEditingEntryId(null); setEditEntryForm({}); setIsEditingDueDate(false); setNewDueDate(null); setIsEditingStatus(false); setNewStatus(null); } }, [visible]);

    // ── No extra API calls — TaskSerializer returns all names already ──────
    const fetchTaskDetails = useCallback(async (id) => {
        if (!id) return;
        setTask(null);
        setIsLoading(true);
        setError(null);
        showSpinner();
        try {
            const res = await api.get(`/clients/tasks/${id}/`);
            setTask(res.data);
            setSelectedUserIds((res.data.assignments || []).filter(a => a.is_active).map(a => a.user));
        } catch {
            setError('Failed to load task details.');
            message.error('Failed to load task details.');
        } finally {
            setIsLoading(false);
            hideSpinner();
        }
    }, [message, showSpinner, hideSpinner]);

    useEffect(() => { if (visible && taskId) fetchTaskDetails(taskId); }, [visible, taskId, fetchTaskDetails]);

    const handleClose = () => { setTask(null); setEditingEntryId(null); setEditEntryForm({}); onClose(); };

    const loadHistory = async () => {
        try { const res = await api.get(`/clients/tasks/${taskId}/history/`); setHistory(res.data || []); setHistoryVisible(true); }
        catch { message.error("Failed to load history"); }
    };

    const startEditEntry  = (e) => { setEditingEntryId(e.id); setEditEntryForm({ start_time: dayjs(e.start_time), end_time: e.end_time ? dayjs(e.end_time) : null, notes: e.notes || "" }); };
    const cancelEditEntry = () => { setEditingEntryId(null); setEditEntryForm({}); };

    const saveEditEntry = async (entryId) => {
        const { start_time, end_time, notes } = editEntryForm;
        if (!start_time || !end_time) { message.warning("Start and end time are required"); return; }
        if (!end_time.isAfter(start_time)) { message.error("End time must be after start time"); return; }
        if (end_time.diff(start_time, "hour", true) > 15) { message.error("Cannot exceed 15 hours"); return; }
        setSavingEntry(true);
        try {
            await api.patch(`/clients/task-time-entries/${entryId}/`, { start_time: start_time.toISOString(), end_time: end_time.toISOString(), notes });
            message.success("Time entry updated"); setEditingEntryId(null); setEditEntryForm({});
            await fetchTaskDetails(task.id); onTaskUpdated();
        } catch (err) { message.error(err?.response?.data?.detail || "Failed to update time entry"); }
        finally { setSavingEntry(false); }
    };

    const deleteTimeEntry = async (entryId) => {
        try { await api.delete(`/clients/task-time-entries/${entryId}/`); message.success("Time entry deleted"); await fetchTaskDetails(task.id); onTaskUpdated(); }
        catch (err) { message.error(err?.response?.data?.detail || "Failed to delete time entry"); }
    };

    const handleQuickAdd = (form, rowIndex, minutes) => {
        const entries = form.getFieldValue("time_entries") || [];
        const row = entries[rowIndex];
        if (!row?.start_time) { message.warning("Please select start time first"); return; }
        const start = dayjs(row.start_time), now = dayjs(), maxEnd = start.add(15, "hour");
        let newEnd = (row.end_time ? dayjs(row.end_time) : start).add(minutes, "minute");
        if (newEnd.isAfter(maxEnd)) newEnd = maxEnd;
        if (newEnd.isAfter(now))    newEnd = now;
        if (!newEnd.isAfter(start)) { message.error("End time must be after start time"); return; }
        const fp = ["time_entries", rowIndex, "end_time"];
        form.setFieldValue(fp, newEnd); form.validateFields([fp]);
    };

    const handleFinish = async (values) => {
        setIsSaving(true);
        showSpinner();
        try {
            const loggedInUserName = user?.full_name || user?.email || "Logged-in User";
            const timeEntries = values.time_entries || [];
            for (let i = 0; i < timeEntries.length; i++) {
                const e = timeEntries[i];
                if (!e.start_time || !e.end_time) continue;
                const s = dayjs(e.start_time), en = dayjs(e.end_time), now = dayjs();
                if (!en.isAfter(s))                    { message.error("End time must be after start time"); return; }
                if (en.diff(s,"hour",true) > 15)       { message.error("Cannot exceed 15 hours"); return; }
                if (en.isAfter(now.add(1,'minute')))   { message.error("Future time not allowed"); return; }
                const overlaps = timeEntries.some((o, idx) => { if (i===idx || !o.start_time || !o.end_time) return false; const oS=dayjs(o.start_time),oE=dayjs(o.end_time); return s.isBefore(oE)&&en.isAfter(oS); });
                if (overlaps) { message.error("Time entries cannot overlap"); return; }
            }
            const newEntries = timeEntries.map(e => ({ employee_name: loggedInUserName, start_time: e.start_time ? dayjs(e.start_time).toISOString() : null, end_time: e.end_time ? dayjs(e.end_time).toISOString() : null, notes: e.notes || null }));
            let newStatusValue = task.status;
            if (newStatusValue === "To Do" && newEntries.some(e => e.start_time)) newStatusValue = "In Progress";
            const fd = new FormData();
            fd.append("status", newStatusValue); fd.append("notes", values.notes || "");
            (selectedUserIds||[]).forEach(uid => fd.append("assigned_users", uid));
            if (values.file?.[0]?.originFileObj) fd.append("file", values.file[0].originFileObj);
            fd.append("assigned_employees_data", JSON.stringify([{ employee_name: loggedInUserName, time_entries: newEntries }]));
            await api.patch(`/clients/tasks/${task.id}/`, fd);
            await fetchTaskDetails(task.id); message.success("Task updated successfully!"); onTaskUpdated(); form.resetFields();
        } catch (error) {
            const data = error.response?.data;
            let msg = "Failed to update task";
            if (data?.detail) msg = data.detail;
            else if (typeof data?.error === "string") msg = data.error;
            else if (Array.isArray(data?.error)) msg = data.error[0];
            else if (data?.non_field_errors) msg = data.non_field_errors[0];
            message.error(msg);
        } finally { setIsSaving(false); hideSpinner(); }
    };

    const handleAssignMultiple = async () => {
        setIsSaving(true);
        showSpinner();
        try { await api.post(`/clients/tasks/${task.id}/assign_multiple/`, { user_ids: selectedUserIds }); message.success("Assignments updated"); setAssignDropdownOpen(false); await fetchTaskDetails(task.id); onTaskUpdated(); }
        catch { message.error("Failed to update assignments"); }
        finally { setIsSaving(false); hideSpinner(); }
    };

    const handleMarkCompleted = async () => {
        setIsSaving(true);
        try { await api.patch(`/clients/tasks/${task.id}/`, { status: "Done" }); message.success("Task marked as completed"); setShowCompleteConfirm(false); onTaskUpdated(); handleClose(); }
        catch { message.error("Failed to mark task as completed"); }
        finally { setIsSaving(false); }
    };

    const timeEntriesColumns = [
        { key: 'start_time', label: 'Start Time', render: (rec) => editingEntryId===rec.id ? <DatePicker showTime={{ use12Hours:true, format:"h:mm A" }} format="DD MMM YYYY h:mm A" value={editEntryForm.start_time} style={{ width:"100%" }} disabledDate={d=>d&&d>dayjs().endOf("day")} onChange={v=>setEditEntryForm(f=>({...f,start_time:v}))} size="small" /> : (rec.start_time ? moment(rec.start_time).format('DD MMM YYYY, h:mm A') : '-') },
        { key: 'end_time', label: 'End Time', render: (rec) => editingEntryId===rec.id ? <DatePicker showTime={{ use12Hours:true, format:"h:mm A" }} format="DD MMM YYYY h:mm A" value={editEntryForm.end_time} style={{ width:"100%" }} onChange={v=>setEditEntryForm(f=>({...f,end_time:v}))} size="small" /> : (rec.end_time ? moment(rec.end_time).format('DD MMM YYYY, h:mm A') : <Tag color="processing">Running</Tag>) },
        { key: 'duration', label: 'Duration', render: (rec) => { const s=editingEntryId===rec.id?editEntryForm.start_time:(rec.start_time?dayjs(rec.start_time):null); const e=editingEntryId===rec.id?editEntryForm.end_time:(rec.end_time?dayjs(rec.end_time):null); if(!s||!e) return '-'; const mins=e.diff(s,"minute"); return mins>0?`${Math.floor(mins/60)}h ${mins%60}m`:'-'; } },
        { key: 'notes', label: 'Comment', render: (rec) => editingEntryId===rec.id ? <Input value={editEntryForm.notes} onChange={e=>setEditEntryForm(f=>({...f,notes:e.target.value}))} placeholder="Comment" size="small" /> : (rec.notes||'-') },
    ];

    // Edit/delete actions for the current user's own entries from today —
    // the column only exists when at least one row in the group would use it.
    const timeEntriesColumnsWithActions = (rows) => {
        const myName = user?.full_name || `${user?.first_name||""} ${user?.last_name||""}`.trim();
        const anyRowEditable = rows.some(rec => rec.employee_name===myName && isToday(rec.start_time) && !isTaskDone);
        if (!anyRowEditable) return timeEntriesColumns;
        return [
            ...timeEntriesColumns,
            { key: 'entry_actions', label: '', render: (rec) => {
                if (rec.employee_name!==myName || !isToday(rec.start_time) || isTaskDone) return null;
                if (editingEntryId===rec.id) return <Space size={4}><button className="icon-btn icon-btn-success" disabled={savingEntry} onClick={()=>saveEditEntry(rec.id)}><SaveOutlined/></button><button className="icon-btn" onClick={cancelEditEntry}><StopOutlined/></button></Space>;
                return <Space size={4}><button className="icon-btn" onClick={()=>startEditEntry(rec)}><EditOutlined/></button><Popconfirm title="Delete this time entry?" description="This cannot be undone." onConfirm={()=>deleteTimeEntry(rec.id)} okText="Delete" okButtonProps={{danger:true}} cancelText="Cancel"><button className="icon-btn icon-btn-danger"><DeleteOutlined/></button></Popconfirm></Space>;
            }},
        ];
    };

    const groupedEntries = useMemo(() => {
        const grouped = {};
        (task?.time_entries || []).forEach(e => { const n=e.employee_name||'Unknown'; if(!grouped[n]) grouped[n]=[]; grouped[n].push(e); });
        return Object.entries(grouped).map(([employee_name, time_entries]) => ({ employee_name, time_entries }));
    }, [task?.time_entries]);

    const getFileName      = (url) => { try { return decodeURIComponent(new URL(url, window.location.origin).pathname.split("/").pop()||""); } catch { return decodeURIComponent((url.split("?")[0]||"").split("/").pop()||""); } };
    const getproofFileName = (url) => { try { return decodeURIComponent(new URL(url, window.location.origin).pathname.split("/").pop()).replace(/_[A-Za-z0-9]+(\.[a-zA-Z0-9]+)$/,"$1"); } catch { return decodeURIComponent(url.split("/").pop()).replace(/_[A-Za-z0-9]+(\.[a-zA-Z0-9]+)$/,"$1"); } };
    const historyIcon = (type) => ({
        created:          <PlusCircleOutlined style={{color:"var(--color-primary)"}}/>,
        assigned:         <UserAddOutlined style={{color:"#fa8c16"}}/>,
        unassigned:       <UserAddOutlined style={{color:"#d9d9d9"}}/>,
        time:             <ClockCircleOutlined style={{color:"#722ed1"}}/>,
        proof:            <FileTextOutlined style={{color:"#13c2c2"}}/>,
        status_changed:   <EditOutlined style={{color:"#1890ff"}}/>,
        due_date_changed: <CalendarOutlined style={{color:"#ff7a45"}}/>,
        done:             <CheckCircleOutlined style={{color:"var(--color-success)"}}/>,
    }[type] || null);

    return (
        <>
            <Modal
                isOpen={showCompleteConfirm}
                title="Confirm Completion"
                onClose={()=>setShowCompleteConfirm(false)}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={()=>setShowCompleteConfirm(false)}>No</button>
                        <button className="btn btn-danger" onClick={handleMarkCompleted}>Yes, Mark Completed</button>
                    </>
                }
            >
                <p>Once completed, you or your team will <b>not be able to add time entries</b> for this task.<br/>Are you sure?</p>
            </Modal>

            <Modal
                title={`Task Details: ${task?.task_id||""} - (${task?.sub_service_name||""})`}
                isOpen={visible}
                onClose={handleClose}
                size="lg"
                keepMounted
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={loadHistory}><HistoryOutlined style={{ marginRight: 6 }}/>History</button>
                        {!isTaskDone && canCompleteTask(user) && (
                            <Tooltip title={canCompleteTaskCheck ? "" : (!hasTimeEntries ? "Add at least one time entry to complete the task" : "Upload proof or mark proof as not required to complete the task")}>
                                <span>
                                    <button className="btn btn-danger" disabled={!canCompleteTaskCheck} onClick={()=>setShowCompleteConfirm(true)}>Mark Completed</button>
                                </span>
                            </Tooltip>
                        )}
                        <button className="btn btn-secondary" onClick={handleClose}>Close</button>
                        {!isTaskDone && <button className="btn btn-primary" onClick={()=>form.submit()} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save'}</button>}
                    </>
                }
            >
                <div>
                    {isLoading
                    ? <div style={{minHeight:200}}/>
                    : error   ? <div style={{padding:20}}><Text type="danger">{error}</Text></div>
                    : task    ? (
                        <>
                            <Descriptions column={{xs:1,sm:2,md:2,lg:3}} layout="vertical">
                                <Descriptions.Item label="Client">{task.client_name}</Descriptions.Item>
                                <Descriptions.Item label="Period">{task.period}</Descriptions.Item>
                                <Descriptions.Item label="Status">
                                    {canEditStatus(user) && !task.legal_status ? (
                                        isEditingStatus ? (
                                            <Space size={8}>
                                                <Select
                                                    value={newStatus}
                                                    style={{ width: 170 }}
                                                    onChange={setNewStatus}
                                                >
                                                    {['To Do', 'In Progress', 'Done'].map(s => (
                                                        <Select.Option key={s} value={s}>{s}</Select.Option>
                                                    ))}
                                                </Select>
                                                <button
                                                    className="icon-btn icon-btn-success"
                                                    disabled={savingStatus}
                                                    onClick={async () => {
                                                        if (!newStatus) {
                                                            message.warning("Please select a status");
                                                            return;
                                                        }
                                                        setSavingStatus(true);
                                                        try {
                                                            await api.patch(`/clients/tasks/${task.id}/`, {
                                                                status: newStatus
                                                            });
                                                            message.success("Status updated");
                                                            setTask(p => ({ ...p, status: newStatus }));
                                                            setIsEditingStatus(false);
                                                            onTaskUpdated();
                                                        } catch (err) {
                                                            message.error(
                                                                err?.response?.data?.detail || "Failed to update status"
                                                            );
                                                        } finally {
                                                            setSavingStatus(false);
                                                        }
                                                    }}
                                                >
                                                    <SaveOutlined />
                                                </button>
                                                <button className="icon-btn" onClick={() => setIsEditingStatus(false)}>
                                                    <StopOutlined />
                                                </button>
                                            </Space>
                                        ) : (
                                            <Space size={8}>
                                                <Tag color={STATUS_COLOR[effectiveStatus] || 'default'} className={statusTagClassName(effectiveStatus)}>
                                                    {formatStatusLabel(effectiveStatus)}
                                                </Tag>
                                                <button className="icon-btn icon-btn-primary" onClick={() => {
                                                        setNewStatus(task.status);
                                                        setIsEditingStatus(true);
                                                    }}
                                                >
                                                    <EditOutlined />
                                                </button>
                                            </Space>
                                        )
                                    ) : (
                                        <Tag color={STATUS_COLOR[effectiveStatus] || 'default'} className={statusTagClassName(effectiveStatus)}>
                                            {formatStatusLabel(effectiveStatus)}
                                        </Tag>
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label="Due Date">
                                    {canEditDueDate(user)&&!isTaskDone ? (
                                        isEditingDueDate ? (
                                            <Space size={8}>
                                                <DatePicker size="small" value={newDueDate} format="DD MMM YYYY" disabledDate={c=>c&&c<dayjs().startOf('day')} onChange={setNewDueDate}/>
                                                <button className="icon-btn icon-btn-success" disabled={savingDueDate} onClick={async()=>{
                                                    if(!newDueDate){message.warning("Please select a date");return;}
                                                    setSavingDueDate(true);
                                                    try{ await api.patch(`/clients/tasks/${task.id}/`,{due_date:newDueDate.format("YYYY-MM-DD")}); message.success("Due date updated"); setTask(p=>({...p,due_date:newDueDate.format("YYYY-MM-DD")})); setIsEditingDueDate(false); onTaskUpdated(); }
                                                    catch{message.error("Failed to update due date");}
                                                    finally{setSavingDueDate(false);}
                                                }}><SaveOutlined/></button>
                                                <button className="icon-btn" onClick={()=>setIsEditingDueDate(false)}><StopOutlined/></button>
                                            </Space>
                                        ) : <Space size={8}><span>{moment(task.due_date).format("DD MMM YYYY")}</span><button className="icon-btn icon-btn-primary" onClick={()=>{setNewDueDate(dayjs(task.due_date));setIsEditingDueDate(true);}}><EditOutlined/></button></Space>
                                    ) : moment(task.due_date).format("DD MMM YYYY")}
                                </Descriptions.Item>
                                <Descriptions.Item label="Team">{task.team_name}</Descriptions.Item>
                                <Descriptions.Item label="Assigned To">{activeAssignments.length ? activeAssignments.map(a=>a.user_name).join(", ") : "Not assigned"}</Descriptions.Item>
                                <Descriptions.Item label="SPOC">{task.spoc_name}</Descriptions.Item>
                                <Descriptions.Item label="Total Hours">{formatDurationFromMillis(calculateTotalMillisFromTimeEntries(task.time_entries||[]))}</Descriptions.Item>
                                <Descriptions.Item label="Created By">{task.created_by_username||"System"}</Descriptions.Item>
                            </Descriptions>

                            {/* ── Related File (single file) ── */}
                            {task?.file && (
                                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--color-slate-200)" }}>
                                    <Text strong style={{ fontSize: 15 }}>Related File</Text>
                                    <div style={{ marginTop: 10 }}>
                                        <Button
                                            type="link"
                                            icon={<FileTextOutlined />}
                                            onClick={() => downloadFileHelper(task.file, getFileName(task.file), message)}
                                            style={{ padding: 0 }}
                                        >
                                            {getFileName(task.file)}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Self-assign button for employees */}
                            {!canAssignTask(user) && !isTaskDone && (() => {
                                const currentUserId = user?.id;
                                const isAlreadyAssigned = activeAssignments.some(a => a.user === currentUserId);
                                const assignedCount = activeAssignments.length;

                                return !isAlreadyAssigned && assignedCount < MAX_ASSIGN ? (
                                    <Form.Item label="Assign To" style={{ marginTop: 16 }}>
                                        <Button
                                            type="default"
                                            icon={<UserAddOutlined />}
                                            disabled={isSaving}
                                            onClick={async () => {
                                                setIsSaving(true);
                                                showSpinner();
                                                try {
                                                    const currentAssignedIds = activeAssignments.map(a => a.user);
                                                    await api.post(`/clients/tasks/${task.id}/assign_multiple/`, {
                                                        user_ids: [...currentAssignedIds, currentUserId],
                                                    });
                                                    message.success("You have been assigned to this task");
                                                    await fetchTaskDetails(task.id);
                                                    onTaskUpdated();
                                                } catch {
                                                    message.error("Failed to assign yourself to this task");
                                                } finally {
                                                    setIsSaving(false);
                                                    hideSpinner();
                                                }
                                            }}
                                        >
                                            Assign Myself to This Task
                                        </Button>
                                    </Form.Item>
                                ) : isAlreadyAssigned ? (
                                    <Form.Item label="Assign To" style={{ marginTop: 16 }}>
                                        <Tag color="green" icon={<CheckCircleOutlined />}>
                                            You are assigned to this task
                                        </Tag>
                                    </Form.Item>
                                ) : null;
                            })()}

                            {/* Multi-assign for managers/leads/admin/founder */}
                            {canAssignTask(user) && !isTaskDone && (
                                <Form.Item label="Assign To" style={{ marginTop: 16 }}>
                                    <Space>
                                        <Select
                                            mode="multiple"
                                            showSearch
                                            optionFilterProp="children"
                                            value={selectedUserIds}
                                            open={assignDropdownOpen}
                                            onDropdownVisibleChange={setAssignDropdownOpen}
                                            style={{ width: 300 }}
                                            placeholder="Assign employees (max 3)"
                                            allowClear
                                            maxTagCount={3}
                                            onChange={vals => {
                                                if (vals.length > MAX_ASSIGN) { message.warning("Only 3 employees allowed"); return; }
                                                setSelectedUserIds(vals);
                                            }}
                                        >
                                            {(allEmployees || []).map(emp =>
                                                <Select.Option
                                                    key={emp.user_id}
                                                    value={emp.user_id}
                                                    disabled={selectedUserIds.length >= MAX_ASSIGN && !selectedUserIds.includes(emp.user_id)}
                                                >
                                                    {emp.user?.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim()}
                                                </Select.Option>
                                            )}
                                        </Select>
                                        <Button type="primary" disabled={isSaving} onClick={handleAssignMultiple}>
                                            Save Assignment
                                        </Button>
                                    </Space>
                                </Form.Item>
                            )}

                            <div className="card" style={{ marginTop: 16 }}>
                                <h3 className="card-title">Assigned Employees &amp; Time Entries</h3>
                                {task.time_entries?.length ? groupedEntries.map((emp,i)=>(
                                    <div key={i} style={{marginBottom:20,border:"1px solid var(--color-slate-200)",padding:15,borderRadius:8}}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--color-slate-900)", marginBottom: 10 }}>
                                            <UserOutlined/> {emp.employee_name}
                                        </div>
                                        <Table rows={emp.time_entries} columns={timeEntriesColumnsWithActions(emp.time_entries)} getRowId={(row) => row.id} />
                                    </div>
                                )) : <Text type="secondary">No employee time entries recorded.</Text>}

                                {!isTaskDone&&(
                                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--color-slate-200)" }}>
                                        <div style={{ fontWeight: 600, color: "var(--color-slate-900)", marginBottom: 12 }}>Time Logs</div>
                                        <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false}>
                                            <Form.List name="time_entries">
                                                {(fields,{add,remove})=>(
                                                    <>
                                                        {fields.map(({key,name,...restField},index)=>(
                                                            <Row key={key} gutter={15} align="top" style={{marginBottom:16}}>
                                                                <Col span={6}>
                                                                    <Form.Item {...restField} name={[name,"start_time"]} rules={[{required:true,message:"Please select start time"}]}>
                                                                        <DatePicker showTime={{use12Hours:true,format:"h:mm A"}} format="YYYY-MM-DD h:mm A" style={{width:"100%"}} placeholder="Start time" disabledDate={c=>c&&c>dayjs().endOf('day')}/>
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={6}>
                                                                    <Form.Item {...restField} name={[name,"end_time"]} dependencies={[["time_entries",name,"start_time"]]} rules={[{required:true,message:"Please select end time"},({getFieldValue})=>({validator(_,value){const start=getFieldValue(["time_entries",name,"start_time"]);if(!start||!value)return Promise.resolve();const s=dayjs(start),e=dayjs(value),now=dayjs();if(e<=s)return Promise.reject(new Error("End time must be after start time"));if(e.diff(s,'hour',true)>15)return Promise.reject(new Error("Cannot exceed 15 hours"));if(e.isAfter(now.add(1,'minute')))return Promise.reject(new Error("Future time not allowed"));return Promise.resolve();}})]}>
                                                                        <DatePicker showTime={{use12Hours:true,format:"h:mm A"}} format="YYYY-MM-DD h:mm A" style={{width:"100%"}} placeholder="End time" disabledDate={current=>{const start=form.getFieldValue(["time_entries",name,"start_time"]);if(!start)return false;const s=dayjs(start),maxDt=s.add(15,"hour"),now=dayjs(),upper=maxDt.isBefore(now)?maxDt:now;return current.isBefore(s.startOf("day"))||current.isAfter(upper.endOf("day"));}}/>
                                                                    </Form.Item>
                                                                    <Space size="small" style={{marginTop:-6}}>
                                                                        {[5,10,30,60].map(m=><Button key={m} size="small" onClick={()=>handleQuickAdd(form,index,m)}>{m<60?`+${m}m`:'+1h'}</Button>)}
                                                                    </Space>
                                                                    <Form.Item noStyle shouldUpdate>{()=>{const s=form.getFieldValue(["time_entries",name,"start_time"]);const e=form.getFieldValue(["time_entries",name,"end_time"]);if(!s||!e)return null;const mins=dayjs(e).diff(dayjs(s),"minute");return <div style={{marginTop:4,color:"var(--color-success)",fontSize:12}}>⏱ Duration: {Math.floor(mins/60)}h {mins%60}m</div>;}}</Form.Item>
                                                                </Col>
                                                                <Col span={11}>
                                                                    <Form.Item {...restField} name={[name,"notes"]} rules={[{required:true,message:"Missing comment"}]}>
                                                                        <Input placeholder="Comment"/>
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={1}><button className="icon-btn icon-btn-danger" style={{marginTop:8}} onClick={()=>remove(name)}><MinusCircleOutlined/></button></Col>
                                                            </Row>
                                                        ))}
                                                        <Form.Item><Button type="dashed" onClick={async ()=>{
                                                            const localEntries = form.getFieldValue("time_entries") || [];
                                                            const localEnds = localEntries.map(e=>e?.end_time).filter(Boolean).map(t=>dayjs(t));
                                                            const suggestion = localEnds.length
                                                                ? localEnds.reduce((a,b)=>(b.isAfter(a)?b:a)).add(1,"minute")
                                                                : await suggestTaskTimeEntryStart();
                                                            add(suggestion ? { start_time: suggestion } : {});
                                                        }} block icon={<ClockCircleOutlined/>}>Add Time Entry</Button></Form.Item>
                                                    </>
                                                )}
                                            </Form.List>
                                        </Form>
                                    </div>
                                )}
                            </div>

                            <div className="card" style={{ marginTop: 16 }}>
                                <h3 className="card-title">Proof</h3>
                                {task?.proof_file ? (
                                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                                        <a href={task.proof_file} target="_blank" rel="noopener noreferrer">{getproofFileName(task.proof_file)}</a>
                                        {!isTaskDone&&<button className="icon-btn icon-btn-danger" onClick={async()=>{try{await api.patch(`/clients/tasks/${task.id}/`,{proof_file:null});message.success("Proof removed");setTask(p=>({...p,proof_file:null}));setProofNotRequired(false);onTaskUpdated();}catch{message.error("Failed to remove proof");}}}><DeleteOutlined/></button>}
                                    </div>
                                ) : !isTaskDone&&(
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
                                        <Upload showUploadList={false} customRequest={async({file,onSuccess,onError})=>{const fd=new FormData();fd.append("proof_file",file);try{const res=await api.patch(`/clients/tasks/${task.id}/`,fd);message.success("Proof uploaded");setTask(p=>({...p,proof_file:res.data.proof_file}));setProofNotRequired(false);onTaskUpdated();onSuccess("ok");}catch(err){message.error("Proof upload failed");onError(err);}}}>
                                            <Button icon={<UploadOutlined/>}>Upload Proof</Button>
                                        </Upload>
                                        <Checkbox checked={proofNotRequired} onChange={e=>setProofNotRequired(e.target.checked)}>Proof not required</Checkbox>
                                    </div>
                                )}
                                {!hasTimeEntries&&!isTaskDone&&<div style={{marginTop:10}}><Text type="secondary">Add at least one time entry to complete the task</Text></div>}
                                {!hasProof&&!proofNotRequired&&hasTimeEntries&&!isTaskDone&&<div style={{marginTop:10}}><Text type="warning">Upload proof or mark proof as not required to complete the task</Text></div>}
                            </div>
                        </>
                    ) : null}
                </div>
            </Modal>

            <Modal isOpen={historyVisible} title={`History – ${task?.task_id}`} onClose={()=>setHistoryVisible(false)} size="lg">
                <Timeline mode="left" items={history.map((h,idx)=>({ key:idx, dot:historyIcon(h.type), label:moment.utc(h.time).local().format("DD MMM YYYY hh:mm A"), children:<div><div style={{fontWeight:600}}>{h.type==="time"?`Added time: ${moment(h.start_time).format("hh:mm A")} → ${moment(h.end_time).format("hh:mm A")}`:h.message}</div><div style={{color:"var(--color-slate-400)"}}>By {h.user}{h.type==="done"&&<Tag color="green" style={{marginLeft:8}}>Done</Tag>}</div></div> }))}/>
            </Modal>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// TaskTableView  — server-side pagination
// ─────────────────────────────────────────────────────────────
const TaskTableView = ({ tasks, onTaskClick, pagination, setPagination, loading, totalCount, allEmployees }) => {
    const employeeNameMap = useMemo(() => {
        const map = {};
        allEmployees.forEach(emp => {
            map[emp.user_id] = emp.user?.full_name || `${emp.first_name||""} ${emp.last_name||""}`.trim();
        });
        return map;
    }, [allEmployees]);
    const getAssignedNames = (rec) =>
        (rec.assigned_user_ids || []).map(id => employeeNameMap[id] || `User ${id}`);

    const columns = [
        {
            key: "serial_number", label: "Sl No",
            render: (_row, absoluteIndex) => absoluteIndex + 1,
        },
        {
            key: "task_id", label: "Task ID",
            sortable: true, sortFn: (a, b) => (a.task_id || "").localeCompare(b.task_id || ""),
            render: (r) => r.task_id,
        },
        {
            key: "created_at", label: "Date",
            sortable: true, sortFn: (a, b) => moment(a.created_at || 0).unix() - moment(b.created_at || 0).unix(),
            render: (r) => r.created_at ? moment(r.created_at).format("DD-MM-YYYY") : "-",
        },
        {
            key: "client_name", label: "Client",
            sortable: true, sortFn: (a, b) => (a.client_name || "").localeCompare(b.client_name || ""),
            render: (r) => (
                <Tooltip title={<div><b>Group:</b> {r.client_group_name || "—"}</div>} placement="right">
                    <span style={{ cursor: "pointer" }}>{r.client_name}</span>
                </Tooltip>
            ),
        },
        {
            key: "sub_service_name", label: "Description", width: 160,
            sortable: true, sortFn: (a, b) => (a.sub_service_name || "").localeCompare(b.sub_service_name || ""),
            render: (r) => (
                <Tooltip title={r.sub_service_name}>
                    <span>{r.sub_service_name}</span>
                </Tooltip>
            ),
        },
        {
            key: "assigned_to", label: "Assigned To", width: 160,
            sortable: true, sortFn: (a, b) => getAssignedNames(a).join(", ").localeCompare(getAssignedNames(b).join(", ")),
            render: (rec) => {
                const names = getAssignedNames(rec);
                const joined = names.length ? names.join(", ") : "";
                return (
                    <Tooltip title={joined}>
                        <span>{joined}</span>
                    </Tooltip>
                );
            },
        },
        { key: "period", label: "Period", render: (r) => r.period },
        {
            key: "due_date", label: "Due Date",
            sortable: true, sortFn: (a, b) => moment(a.due_date).unix() - moment(b.due_date).unix(),
            render: (r) => r.due_date ? moment(r.due_date).format("YYYY-MM-DD") : "-",
        },
        {
            key: "status", label: "Status",
            sortable: true, sortFn: (a, b) => getEffectiveTaskStatus(a).localeCompare(getEffectiveTaskStatus(b)),
            render: (record) => {
                const status = getEffectiveTaskStatus(record);
                return <Tag color={STATUS_COLOR[status] || "default"} className={statusTagClassName(status)}>{formatStatusLabel(status)}</Tag>;
            },
        },
        {
            key: "created_by_name", label: "Created By",
            sortable: true, sortFn: (a, b) => (a.created_by_name || "").localeCompare(b.created_by_name || ""),
            render: (r) => r.created_by_name || "System",
        },
        {
            key: "team_name", label: "Team",
            sortable: true, sortFn: (a, b) => (a.team_name || "").localeCompare(b.team_name || ""),
            render: (r) => r.team_name,
        },
    ];

    return (
        <Table
            rows={tasks}
            columns={columns}
            getRowId={(row) => row.id}
            onRowClick={(record) => onTaskClick(record.id)}
            serverPagination={{
                page: pagination.current,
                pageSize: pagination.pageSize,
                total: totalCount,
                onPageChange: (p) => setPagination(prev => ({ ...prev, current: p })),
                pageSizeOptions: [20, 50, 100, 200],
                onPageSizeChange: (s) => setPagination({ current: 1, pageSize: s }),
            }}
        />
    );
};

// ─────────────────────────────────────────────────────────────
// FilterForm
// ─────────────────────────────────────────────────────────────
const FilterForm = ({ clients, subservices, spocs, teams, tasks, mainServices, onFilter, onReset, initialValues, isClientFilterDisabled, allEmployees = [] }) => {
    const [form] = Form.useForm();
    const [filteredSubservices, setFilteredSubservices] = React.useState(subservices);

    // Watch for changes in main_service field
    const selectedMainServices = Form.useWatch('main_service', form);

    useEffect(() => {
        form.setFieldsValue(initialValues);
    }, [initialValues, form]);

    // Filter descriptions (sub services) based on the selected main services
    useEffect(() => {
        if (!selectedMainServices || selectedMainServices.length === 0) {
            setFilteredSubservices([...subservices]);
        } else {
            const filtered = subservices.filter(sub =>
                selectedMainServices.includes(sub.main_service)
            );
            setFilteredSubservices(filtered);
        }
    }, [selectedMainServices, subservices]);

    const createdByOptions = useMemo(() =>
        Array.from(new Set((allEmployees || []).map(emp => getEmployeeDisplayName(emp)).filter(Boolean))).sort((a,b)=>a.localeCompare(b)),
    [allEmployees]);

    return (
        <Form form={form} layout="vertical" onValuesChange={(_,all)=>onFilter(all)} style={{marginTop:16,marginBottom:24}}>
            <Row gutter={16}>
                <Col xs={24} sm={12} md={8} lg={6}><Form.Item name="task_id" label="Task ID"><Input placeholder="Search Task ID" allowClear prefix={<SearchOutlined style={{ color: "var(--color-slate-400)" }} />} /></Form.Item></Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Form.Item name="client" label="Client">
                        <Select mode="multiple" allowClear placeholder="Select Client(s)" disabled={isClientFilterDisabled} showSearch optionFilterProp="children">
                            {[...clients].sort((a,b)=>`${a.group_name||''} ${a.name}`.toLowerCase().localeCompare(`${b.group_name||''} ${b.name}`.toLowerCase())).map(c=><Option key={c.id} value={c.id}>{c.group_name?`${c.group_name} – ${c.name}`:c.name}</Option>)}
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Form.Item name="main_service" label="Main Service">
                        <Select mode="multiple" allowClear placeholder="Select Main Service(s)" showSearch optionFilterProp="children">
                            {[...mainServices].sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase())).map(m=><Option key={m.id} value={m.id}>{m.name}</Option>)}
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Form.Item name="subservice" label="Description">
                        <Select mode="multiple" allowClear placeholder="Select Description(s)" showSearch optionFilterProp="children">
                            {[...filteredSubservices].sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase())).map(s=><Option key={s.id} value={s.id}>{s.name}</Option>)}
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Form.Item name="spoc" label="SPOC">
                        <Select mode="multiple" allowClear placeholder="Select SPOC(s)" showSearch optionFilterProp="children">
                            {[...spocs].sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase())).map(s=><Option key={s.id} value={s.id}>{s.name}</Option>)}
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Form.Item name="team" label="Team">
                        <Select mode="multiple" allowClear placeholder="Select Team(s)" showSearch optionFilterProp="children">
                            {[...teams].sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase())).map(t=><Option key={t.id} value={t.id}>{t.name}</Option>)}
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Form.Item name="status" label="Status">
                        <Select mode="multiple" allowClear placeholder="Select Status">
                            {[
                                'Done', 'In Progress', 'Over Due', 'To Do',
                                'wip', 'under_review', 'open', 'closed', 'attention_required'
                            ].map(s => (
                                <Option key={s} value={s}>
                                    {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Form.Item name="createdBy" label="Created By">
                        <Select mode="multiple" allowClear showSearch placeholder="Select User(s)" optionFilterProp="children">
                            {createdByOptions.map(n=><Option key={n} value={n}>{n}</Option>)}
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                    <Form.Item name="due_date" label="Due Date">
                        <RangePicker style={{width:"100%"}} allowClear/>
                    </Form.Item>
                </Col>
                <Col xs={24} style={{textAlign:'right',marginTop:16}}>
                    <Button onClick={()=>{form.resetFields();onReset();}}>Reset</Button>
                </Col>
            </Row>
        </Form>
    );
};

// ─────────────────────────────────────────────────────────────
// JiraBoard — main container
// ─────────────────────────────────────────────────────────────
const JiraBoard = ({ statusFilter, clientIdFilter, onBack }) => {
    const { user }    = useAuth();
    const location    = useLocation();
    const navigate    = useNavigate();
    const { message } = App.useApp();
    const token       = sessionStorage.getItem('token');
    const { showSpinner, hideSpinner } = useContext(SpinnerContext);

    const [tasks, setTasks]           = useState([]);          // current page of tasks
    const [totalCount, setTotalCount] = useState(0);           // total from API
    const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });
    const [lookups, setLookups]       = useState({ clients:[], spocs:[], subservices:[], teams:[], allEmployees:[], clientGroups:[], mainServices:[] });

    const getInitialFilters = () => {
        const q = new URLSearchParams(window.location.search);
        const filters = {};

        const status = q.get("status");

        if (status && status !== "all") {
            filters.status = [status];
        }

        return filters;
    };

    const [filterValues, setFilterValues] = useState(getInitialFilters);
    const showMyTasks = new URLSearchParams(location.search).get("scope") === "my";

    const [isTaskDetailModalVisible,  setIsTaskDetailModalVisible]  = useState(false);
    const [isCreateTaskModalVisible,  setIsCreateTaskModalVisible]  = useState(false);
    const [isBulkUploadModalVisible,  setIsBulkUploadModalVisible]  = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const parseIds = (v) => { if(!v) return []; if(Array.isArray(v)) return v; return v.split(",").map(x=>x.trim()).filter(Boolean); };

    // ── Build query params from filterValues + pagination ────────────────────
    // Filters are sent to the server — no client-side filtering of the full list
    const buildParams = useCallback(() => {
        const q = new URLSearchParams(location.search);
        const scope = q.get("scope") || "all";
        const params = {
            scope,
            page:      pagination.current,
            page_size: pagination.pageSize,
        };
        if (filterValues.task_id)          params.task_id    = filterValues.task_id;
        if (filterValues.client?.length)   params.client     = filterValues.client.join(",");
        if (filterValues.main_service?.length) params.main_service = filterValues.main_service.join(",");
        if (filterValues.subservice?.length) params.sub_service = filterValues.subservice.join(",");
        if (filterValues.spoc?.length)     params.spoc       = filterValues.spoc.join(",");
        if (filterValues.team?.length)     params.team       = filterValues.team.join(",");
        if (filterValues.status?.length)   params.status     = filterValues.status.join(",");
        if (filterValues.createdBy?.length) params.created_by_name = filterValues.createdBy.join(",");
        if (filterValues.due_date?.length === 2) {
            params.due_date_after  = dayjs(filterValues.due_date[0]).format("YYYY-MM-DD");
            params.due_date_before = dayjs(filterValues.due_date[1]).format("YYYY-MM-DD");
        }
        return params;
    }, [filterValues, pagination, location.search]);

    // ── Fetch one page of tasks ───────────────────────────────────────────────
    // Response shape from DRF pagination: { count, next, previous, results }
    const fetchTasks = useCallback(async () => {
        if (!token) return;
        showSpinner();
        try {
            const t0  = performance.now();
            const res = await api.get('/clients/tasks/', { params: buildParams(), headers: { Authorization: `Token ${token}` } });
            console.log(`✅ API responded in ${(performance.now()-t0).toFixed(0)}ms — page ${pagination.current}, ${res.data.results?.length} tasks (total: ${res.data.count})`);

            const results = res.data.results ?? res.data;  // fallback if pagination not yet applied
            const count   = res.data.count   ?? results.length;
            setTasks(results);
            setTotalCount(count);
        } catch {
            message.error("Failed to load tasks");
        } finally {
            hideSpinner();
        }
    }, [token, buildParams, message, showSpinner, hideSpinner]);

    // ── Fetch lookups once ────────────────────────────────────────────────────
    const loadLookups = useCallback(async () => {
        if (!token) return;
        try { const data = await fetchLookupsOnce(token); setLookups(data); }
        catch { console.warn("Lookup data failed to load"); }
    }, [token]);

    useEffect(() => { loadLookups(); }, [loadLookups]);

    // Re-fetch whenever page, pageSize, filters, or scope changes
    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    // Reset to page 1 when filters change
    const handleFilterChange = useCallback((vals) => {
        setFilterValues(vals);
        setPagination(p => ({ ...p, current: 1 }));
    }, []);

    // ── Read URL params on mount ──────────────────────────────────────────────
    useEffect(() => {
        const q = new URLSearchParams(location.search);
        const urlFilters = {};
        const status      = q.get("status");
        const startDate   = q.get("start_date");
        const endDate     = q.get("end_date");
        const clientIds   = parseIds(q.get("client_id"));
        const teamIds     = parseIds(q.get("team_id"));
        const subIds      = parseIds(q.get("sub_service_id"));
        if (status && status !== "all") urlFilters.status = [status];
        if (clientIds.length)  urlFilters.client      = clientIds.map(Number);
        if (teamIds.length)    urlFilters.team        = teamIds.map(Number);
        if (subIds.length)     urlFilters.subservice  = subIds.map(Number);
        if (startDate && endDate) urlFilters.due_date = [dayjs(startDate,"YYYY-MM-DD"), dayjs(endDate,"YYYY-MM-DD")];
        if (statusFilter)     urlFilters.status    = [statusFilter];
        if (clientIdFilter)   urlFilters.client    = [clientIdFilter];
        if (Object.keys(urlFilters).length) setFilterValues(urlFilters);
    }, []);

    const toggleScope = () => {
        const q = new URLSearchParams(location.search);
        q.set("scope", showMyTasks ? "all" : "my");
        navigate(`${location.pathname}?${q.toString()}`);
        setPagination(p => ({ ...p, current: 1 }));
    };

    const handleTaskClick = (taskId) => {
        setSelectedTask(tasks.find(t => t.id === taskId) || null);
        setIsTaskDetailModalVisible(true);
    };

    const refreshDashboard = useCallback(() => { fetchTasks(); }, [fetchTasks]);

    const employeeNameMap = useMemo(() => {
        const map = {};
        (lookups.allEmployees || []).forEach(emp => {
            map[emp.user_id] = emp.user?.full_name || `${emp.first_name||""} ${emp.last_name||""}`.trim();
        });
        return map;
    }, [lookups.allEmployees]);

    const getAssignedNames = (task) =>
        (task.assigned_user_ids || []).map(id => employeeNameMap[id] || `User ${id}`).join(", ") || "Not assigned";

    const exportToExcel = async (fileNamePrefix, currentPageOnly = false) => {
        message.loading({ content: 'Preparing export...', key: 'export' });
        try {
            let allTasks;

            if (currentPageOnly) {
                // ── Current page: use already-loaded tasks, no API call needed ──
                allTasks = tasks;
            } else {
                // ── Download All: fetch all matching records without pagination ──
                const { page, page_size, ...exportParams } = buildParams();
                const res = await api.get('/clients/tasks/export', {
                    params: { ...exportParams, page: 1, page_size: 99999 },
                    headers: { Authorization: `Token ${token}` },
                });
                allTasks = res.data.results ?? res.data;
            }

            const headers = ['Sl No','Task ID','Date','Client','Description','SPOC','Assigned To','Team','Period','Due Date','Status','Created By','Total Hours'];

            const data = allTasks.map((task, i) => [
                i+1, task.task_id, moment(task.created_at).format('DD-MM-YYYY'),
                task.client_name||'N/A', task.sub_service_name||'N/A', task.spoc_name||'N/A', getAssignedNames(task), task.team_name||'N/A',
                task.period||'N/A', moment(task.due_date).format('YYYY-MM-DD'),
                formatStatusLabel(getEffectiveTaskStatus(task)), task.created_by_name||'System',
                formatDurationFromMillis((task.total_hours||0)*3600*1000),
            ]);

            const allData = [headers, ...data];
            const ws      = XLSX.utils.aoa_to_sheet(allData);
            const hStyle  = { font:{bold:true,color:{rgb:"FFFFFF"}}, fill:{fgColor:{rgb:"01263a"}}, border:{top:{style:"thin"},right:{style:"thin"},bottom:{style:"thin"},left:{style:"thin"}} };
            const cStyle  = { border:{top:{style:"thin"},right:{style:"thin"},bottom:{style:"thin"},left:{style:"thin"}} };
            const range   = XLSX.utils.decode_range(ws['!ref']);
            for (let R=range.s.r; R<=range.e.r; ++R)
                for (let C=range.s.c; C<=range.e.c; ++C) {
                    const ref = XLSX.utils.encode_cell({r:R,c:C});
                    if (ws[ref]) ws[ref].s = R===0 ? hStyle : cStyle;
                }
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
            XLSX.writeFile(wb, `${(user?.full_name||'exported').replace(/\s/g,'_')}_${fileNamePrefix}_${moment().format('YYYY-MM-DD')}.xlsx`);
            message.success({ content: `Exported ${allTasks.length} records`, key: 'export' });
        } catch {
            message.error({ content: 'Export failed', key: 'export' });
        }
    };

    // ── Update menu handler to pass the flag ──
    const handleMenuClick = ({ key }) => {
        if (key === 'all')     exportToExcel('all_tasks',          false);
        if (key === 'current') exportToExcel(`page_${pagination.current}_tasks`, true);
    };

    const downloadMenu = <Menu onClick={handleMenuClick} items={[{ key:"all", label:"Download All" }, { key:"current", label:"Download Current Page" }]}/>;

    useEffect(() => {
        const handler = (e) => {
            if (['input','textarea'].includes(e.target.tagName.toLowerCase())) return;
            if (e.ctrlKey && e.key === 'r') { e.preventDefault(); refreshDashboard(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [refreshDashboard]);

    return (
        <App>
            <div className="page-container">
                <Row justify="space-between" align="middle" style={{marginBottom:'24px'}}>
                    <Col>
                        <Title level={2} style={{margin:0}}>
                            {clientIdFilter ? `Tasks for ${lookups.clients.find(c=>c.id===clientIdFilter)?.name||'Client'}` : 'STT Record'}
                        </Title>
                    </Col>
                    <Col>
                        <Space>
                            {clientIdFilter && <Button icon={<LeftOutlined/>} onClick={onBack}>Back to Dashboard</Button>}
                            {user?.role==='Admin' && <CreateMonthlyTasksButton/>}
                            <Button icon={<PlusOutlined/>} onClick={()=>setIsCreateTaskModalVisible(true)}>Create New Task</Button>
                            <Button icon={<UploadOutlined/>} onClick={()=>setIsBulkUploadModalVisible(true)}>Bulk Upload</Button>
                            <Dropdown overlay={downloadMenu} trigger={['click']}><Button icon={<DownloadOutlined/>}>Download</Button></Dropdown>
                            <Button style={{minWidth:120}} icon={showMyTasks?<TeamOutlined/>:<UserOutlined/>} onClick={toggleScope}>{showMyTasks?"All Tasks":"My Tasks"}</Button>
                            <Button type="default" icon={<ReloadOutlined/>} onClick={refreshDashboard}>Refresh</Button>
                        </Space>
                    </Col>
                </Row>

                <Collapse className="filters-collapse-transparent" items={[{ key:'1', label:<div style={{fontSize:'19px',fontWeight:'bold'}}><FilterOutlined style={{fontSize:'19px',marginRight:'8px'}}/>Filters</div>, children:(
                    <FilterForm
                        clients={lookups.clients} subservices={lookups.subservices} spocs={lookups.spocs} teams={lookups.teams} tasks={tasks} mainServices={lookups.mainServices} allEmployees={lookups.allEmployees}
                        onFilter={handleFilterChange}
                        onReset={()=>{ setFilterValues(clientIdFilter?{client:[clientIdFilter]}:{}); setPagination(p=>({...p,current:1})); }}
                        initialValues={filterValues}
                        isClientFilterDisabled={!!clientIdFilter}
                    />
                )}]} bordered={false} style={{marginBottom:'24px', background:'transparent'}}/>
                <style>{`
                    .filters-collapse-transparent, .filters-collapse-transparent .ant-collapse-item,
                    .filters-collapse-transparent .ant-collapse-header, .filters-collapse-transparent .ant-collapse-content,
                    .filters-collapse-transparent .ant-collapse-content-box {
                        background: transparent !important;
                    }
                `}</style>

                <TaskTableView
                    tasks={tasks}
                    pagination={pagination}
                    setPagination={setPagination}
                    onTaskClick={handleTaskClick}
                    totalCount={totalCount}
                    allEmployees={lookups.allEmployees}
                />

                <TaskDetailView
                    visible={isTaskDetailModalVisible}
                    taskId={selectedTask?.id}
                    onClose={()=>{ setIsTaskDetailModalVisible(false); setSelectedTask(null); }}
                    onTaskUpdated={refreshDashboard}
                    allEmployees={lookups.allEmployees}
                />

                <CreateTaskModal
                    visible={isCreateTaskModalVisible}
                    onClose={()=>setIsCreateTaskModalVisible(false)}
                    clients={lookups.clients} clientGroups={lookups.clientGroups}
                    mainServices={lookups.mainServices} spocs={lookups.spocs}
                    subservices={lookups.subservices} teams={lookups.teams}
                    allEmployees={lookups.allEmployees}
                    onTaskCreated={refreshDashboard}
                />

                <BulkUploadTaskModal
                    visible={isBulkUploadModalVisible}
                    onClose={()=>setIsBulkUploadModalVisible(false)}
                    clients={lookups.clients} clientGroups={lookups.clientGroups}
                    mainServices={lookups.mainServices} spocs={lookups.spocs}
                    subservices={lookups.subservices} teams={lookups.teams}
                    allEmployees={lookups.allEmployees}
                    onTasksCreated={refreshDashboard}
                />
            </div>
        </App>
    );
};

export { TaskDetailView };
export default JiraBoard;