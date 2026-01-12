
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
    Users,
    Calendar as CalendarIcon,
    DollarSign,
    Settings,
    Plus,
    Trash2,
    Save,
    CheckCircle,
    History,
    TrendingUp,
    CreditCard,
    PieChart,
    Download,
    Edit2,
    X,
    Clock,
    ChevronDown,
    Database,
    CloudOff
} from 'lucide-react';

const generateTimeOptions = (hours) => {
    const options = [];
    hours.forEach(h => {
        for (let m = 0; m < 60; m += 5) {
            options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    });
    return options;
};

const START_TIME_OPTIONS = generateTimeOptions([15, 16, 17, 18, 19, 20, 21]);
const END_TIME_OPTIONS = generateTimeOptions([17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5]);

// --- Utility Components ---

const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
        {children}
    </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const variants = {
        primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
        danger: 'bg-red-50 hover:bg-red-100 text-red-600',
        success: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    };

    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-lg font-medium transition-all active:scale-95 flex items-center gap-2 ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

const Input = ({ label, ...props }) => (
    <div className="flex flex-col gap-1.5">
        {label && <label className="text-sm font-medium text-slate-600">{label}</label>}
        <input
            className="px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            {...props}
        />
    </div>
);

const TimeSelect = ({ label, value, onChange, options }) => (
    <div className="flex flex-col gap-1.5">
        {label && <label className="text-sm font-medium text-slate-600">{label}</label>}
        <div className="relative">
            <select
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white appearance-none cursor-pointer"
                value={value}
                onChange={onChange}
            >
                <option value="">--:--</option>
                {options.map(t => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={16} />
            </div>
        </div>
    </div>
);

// --- Main Component ---

const SalaryManager = () => {
    // State
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(!supabase);

    // Data State
    const [employees, setEmployees] = useState([]);
    const [records, setRecords] = useState([]);
    const [settings, setSettings] = useState({
        defaultHourlyRate: 20,
        defaultUnitPrice: 0.25
    });

    // Load Data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        if (!supabase) {
            // Fallback to LocalStorage if no Supabase config
            const localEmps = JSON.parse(localStorage.getItem('sm_employees') || '[]');
            const localRecs = JSON.parse(localStorage.getItem('sm_records') || '[]');
            const localSets = JSON.parse(localStorage.getItem('sm_settings') || JSON.stringify(settings));

            setEmployees(localEmps);
            setRecords(localRecs);
            setSettings(localSets);
            setIsOffline(true);
            setLoading(false);
            return;
        }

        try {
            const { data: emps, error: empError } = await supabase.from('employees').select('*');
            if (empError) throw empError;

            const { data: recs, error: recError } = await supabase.from('work_records').select('*');
            if (recError) throw recError;

            // Map DB snake_case to App camelCase
            const mappedEmps = (emps || []).map(e => ({
                ...e,
                hourlyRate: e.hourly_rate ?? e.hourlyRate // Map to frontend expected key
            }));

            const mappedRecs = (recs || []).map(r => ({
                ...r,
                employeeId: r.employee_id,
                salary: r.daily_salary,
                paidAt: r.paid_at
            }));

            const localSets = JSON.parse(localStorage.getItem('sm_settings') || JSON.stringify(settings));
            setSettings(localSets);

            setEmployees(mappedEmps);
            setRecords(mappedRecs);
            setIsOffline(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            // Show the specific error to help debugging
            alert(`Connection Error: ${error.message || JSON.stringify(error)}`);
            setIsOffline(true);
        } finally {
            setLoading(false);
        }
    };

    // --- Restored Utilities ---

    const formatDateWithWeekday = (dateStr) => {
        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString('zh-CN', { weekday: 'short' });
        return `${date.toLocaleDateString()} (${dayName})`;
    };

    const getAvatarChar = (name) => {
        if (!name) return '?';
        if (name.startsWith('小') && name.length > 1) {
            return name.charAt(1);
        }
        return name.charAt(0).toUpperCase();
    };

    // Derived State
    const unpaidRecords = records.filter(r => !r.paid);
    const totalUnpaid = unpaidRecords.reduce((sum, r) => sum + r.salary, 0);

    // Handlers

    // Helper to sync local if offline
    const saveLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

    const addEmployee = async (name) => {
        const newEmployee = {
            id: Date.now().toString(),
            name,
            // joinedAt: new Date().toISOString() // DB handles created_at usually, but let's send it if we want consistency
            // mapping camelCase to snake_case for DB if needed, but supabase js can assign standard JSON if column names match or we map them.
            // Let's assume we use snake_case in DB: name, hourly_rate.
        };

        if (isOffline) {
            const list = [...employees, newEmployee];
            setEmployees(list);
            saveLocal('sm_employees', list);
        } else {
            const { data, error } = await supabase
                .from('employees')
                .insert([{ name, hourly_rate: settings.defaultHourlyRate }])
                .select()
                .single();

            if (error) {
                alert('Error adding employee: ' + error.message);
                return;
            }
            // Supabase returns the new object with real ID
            setEmployees([...employees, {
                ...data,
                hourlyRate: data.hourly_rate // Map back to camelCase for app usage
            }]);
        }
    };

    const removeEmployee = async (id) => {
        if (isOffline) {
            const newEmps = employees.filter(e => e.id !== id);
            const newRecs = records.filter(r => r.employeeId !== id);
            setEmployees(newEmps);
            setRecords(newRecs);
            saveLocal('sm_employees', newEmps);
            saveLocal('sm_records', newRecs);
        } else {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) {
                alert('Error deleting: ' + error.message);
                return;
            }
            setEmployees(employees.filter(e => e.id !== id));
            setRecords(records.filter(r => r.employeeId !== id)); // Cascading delete in UI
        }
    };

    const updateEmployee = async (id, updates) => {
        // Map updates to snake_case
        const dbUpdates = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;

        if (isOffline) {
            const list = employees.map(e => e.id === id ? { ...e, ...updates } : e);
            setEmployees(list);
            saveLocal('sm_employees', list);
        } else {
            const { data, error } = await supabase
                .from('employees')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                alert('Update failed');
                return;
            }
            setEmployees(employees.map(e => e.id === id ? { ...e, ...updates } : e));
        }
    };

    const addRecord = async (record) => {
        const localRecord = { ...record, id: Date.now().toString(), paid: false, createdAt: new Date().toISOString() };

        if (isOffline) {
            const list = [...records, localRecord];
            setRecords(list);
            saveLocal('sm_records', list);
        } else {
            // Dict keys: employee_id, date, hours, strings, amount, hourly_rate (snapshot?), daily_salary...
            const dbRecord = {
                employee_id: record.employeeId,
                date: record.date,
                hours: record.hours,
                strings: record.strings,
                daily_salary: record.salary,
                status: 'unsettled',
                paid: false,
                type: record.type,
                amount: record.amount
            };

            const { data, error } = await supabase
                .from('work_records')
                .insert([dbRecord])
                .select()
                .single();

            if (error) {
                console.error(error);
                alert('Save failed: ' + error.message);
                return;
            }

            setRecords([...records, {
                ...record,
                id: data.id,
                paid: false,
                createdAt: data.created_at
            }]);
        }
    };

    const settleRecords = async (employeeId) => {
        const now = new Date().toISOString();
        if (isOffline) {
            const list = records.map(r => {
                if (r.employeeId === employeeId && !r.paid) {
                    return { ...r, paid: true, paidAt: now };
                }
                return r;
            });
            setRecords(list);
            saveLocal('sm_records', list);
        } else {
            // Update where employee_id = X and paid = false
            const { error } = await supabase
                .from('work_records')
                .update({ paid: true, paid_at: now, status: 'settled' })
                .eq('employee_id', employeeId)
                .eq('paid', false);

            if (error) {
                alert('Settlement failed');
                return;
            }

            setRecords(records.map(r => {
                if (r.employeeId === employeeId && !r.paid) {
                    return { ...r, paid: true, paidAt: now };
                }
                return r;
            }));
        }
    };

    const updateRecord = async (id, unmappedUpdates) => {
        // Map updates to snake_case for DB
        const dbUpdates = {};
        if (unmappedUpdates.date) dbUpdates.date = unmappedUpdates.date;
        if (unmappedUpdates.hours !== undefined) dbUpdates.hours = unmappedUpdates.hours;
        if (unmappedUpdates.strings !== undefined) dbUpdates.strings = unmappedUpdates.strings;
        if (unmappedUpdates.salary !== undefined) dbUpdates.daily_salary = unmappedUpdates.salary;
        if (unmappedUpdates.type) dbUpdates.type = unmappedUpdates.type;
        if (unmappedUpdates.amount !== undefined) dbUpdates.amount = unmappedUpdates.amount;

        if (isOffline) {
            const list = records.map(r => r.id === id ? { ...r, ...unmappedUpdates } : r);
            setRecords(list);
            saveLocal('sm_records', list);
        } else {
            const { error } = await supabase
                .from('work_records')
                .update(dbUpdates)
                .eq('id', id);

            if (error) {
                alert('Update failed: ' + error.message);
                return;
            }

            setRecords(records.map(r => r.id === id ? { ...r, ...unmappedUpdates } : r));
        }
    };

    const deleteRecord = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;

        if (isOffline) {
            const list = records.filter(r => r.id !== id);
            setRecords(list);
            saveLocal('sm_records', list);
        } else {
            const { error } = await supabase
                .from('work_records')
                .delete()
                .eq('id', id);

            if (error) {
                alert('Delete failed: ' + error.message);
                return;
            }
            setRecords(records.filter(r => r.id !== id));
        }
    };

    const exportData = () => {
        const headers = ['Date', 'Employee Name', 'Type', 'Hours', 'Strings', 'Salary', 'Paid Status', 'Paid Date'];
        const csvRows = [headers.join(',')];

        records.forEach(record => {
            const emp = employees.find(e => e.id === record.employeeId);
            const row = [
                formatDateWithWeekday(record.date),
                emp ? emp.name : 'Unknown',
                record.type,
                record.hours || 0,
                record.strings || 0,
                record.salary.toFixed(2),
                record.paid ? 'Paid' : 'Unpaid',
                record.paidAt ? new Date(record.paidAt).toLocaleDateString() : '-'
            ];
            // Escape quotes and wrap fields in quotes to handle commas within data
            const escapedRow = row.map(field => {
                const stringField = String(field);
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return `"${stringField.replace(/"/g, '""')}"`;
                }
                return stringField;
            });
            csvRows.push(escapedRow.join(','));
        });

        const csvString = csvRows.join('\n');
        // Add BOM for Excel compatibility and strictly encode
        const csvContent = "\uFEFF" + csvString;
        const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);

        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `salary_data_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Sub-Components (Tabs) ---

    const Dashboard = () => {
        const lastPayouts = employees.map(emp => {
            const paidRecs = records.filter(r => r.employeeId === emp.id && r.paid && r.paidAt);
            if (paidRecs.length === 0) return null;

            // Find the most recent paidAt timestamp
            const sorted = [...paidRecs].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
            const latestDate = sorted[0].paidAt;

            // Sum records matches this specific timestamp
            const batch = sorted.filter(r => r.paidAt === latestDate);
            const total = batch.reduce((sum, r) => sum + r.salary, 0);

            return {
                id: emp.id,
                name: emp.name,
                date: latestDate,
                amount: total
            };
        }).filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-6 border-l-4 border-l-indigo-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total Unpaid</p>
                                <h3 className="text-2xl font-bold text-slate-800">${totalUnpaid.toFixed(2)}</h3>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-l-4 border-l-emerald-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Active Employees</p>
                                <h3 className="text-2xl font-bold text-slate-800">{employees.length}</h3>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-l-4 border-l-amber-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-50 rounded-full text-amber-600">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Work Records</p>
                                <h3 className="text-2xl font-bold text-slate-800">{records.length}</h3>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <CheckCircle className="text-emerald-500" size={20} />
                            Last Payouts
                        </h3>
                        <div className="space-y-4">
                            {lastPayouts.map(payout => (
                                <div key={payout.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                                            {getAvatarChar(payout.name)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">{payout.name}</p>
                                            <p className="text-xs text-slate-500">{formatDateWithWeekday(payout.date)}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-emerald-600">
                                        ${payout.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                            {lastPayouts.length === 0 && <p className="text-slate-400 text-center py-4">No payment history yet</p>}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <PieChart className="text-slate-400" size={20} />
                            Unpaid by Employee
                        </h3>
                        <div className="space-y-3">
                            {employees.map(emp => {
                                const empUnpaid = unpaidRecords.filter(r => r.employeeId === emp.id).reduce((sum, r) => sum + r.salary, 0);
                                if (empUnpaid === 0) return null;
                                return (
                                    <div key={emp.id} className="flex justify-between items-center pb-2 border-b border-slate-50 last:border-0">
                                        <span className="text-slate-700">{emp.name}</span>
                                        <span className="font-mono font-medium text-slate-900">${empUnpaid.toFixed(2)}</span>
                                    </div>
                                )
                            })}
                            {unpaidRecords.length === 0 && <p className="text-slate-400 text-center py-4">All caught up!</p>}
                        </div>
                    </Card>
                </div>
            </div>
        );
    };

    const EmployeeManager = () => {
        const [newName, setNewName] = useState('');
        const [editingId, setEditingId] = useState(null);
        const [deletingId, setDeletingId] = useState(null);

        // Modal State
        const [editName, setEditName] = useState('');
        const [editRate, setEditRate] = useState('');

        const startEditing = (emp) => {
            setEditingId(emp.id);
            setEditName(emp.name);
            setEditRate(emp.hourlyRate !== undefined ? emp.hourlyRate : settings.defaultHourlyRate);
        };

        const saveEdit = () => {
            updateEmployee(editingId, {
                name: editName,
                hourlyRate: parseFloat(editRate) || 0
            });
            setEditingId(null);
        };

        const handleSubmit = (e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            addEmployee(newName);
            setNewName('');
        };

        return (
            <div className="space-y-6">
                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <Input
                                label="New Employee Name"
                                placeholder="e.g. John Doe"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                        </div>
                        <Button type="submit">
                            <Plus size={18} /> Add
                        </Button>
                    </form>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.map(emp => (
                        <Card key={emp.id} className="p-4 hover:shadow-md transition-shadow relative group">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => startEditing(emp)}>
                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg relative">
                                        {getAvatarChar(emp.name)}
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit2 size={10} className="text-slate-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{emp.name}</h4>
                                        <p className="text-xs text-slate-500">Rate: ${emp.hourlyRate !== undefined ? emp.hourlyRate : settings.defaultHourlyRate}/hr</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => startEditing(emp)}
                                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                    >
                                        <Settings size={16} />
                                    </button>
                                    <button
                                        onClick={() => setDeletingId(emp.id)}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {employees.length === 0 && (
                        <div className="col-span-full text-center py-10 opacity-50">
                            <Users size={48} className="mx-auto mb-2 text-slate-300" />
                            <p>No employees found. Add one to get started.</p>
                        </div>
                    )}
                </div>

                {/* Edit Modal */}
                {editingId && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800">Edit Employee</h3>
                                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <Input
                                label="Name"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                            />

                            <Input
                                type="number"
                                label="Hourly Rate ($/hr)"
                                step="0.01"
                                value={editRate}
                                onChange={e => setEditRate(e.target.value)}
                            />

                            <div className="flex gap-3 justify-end pt-2">
                                <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                                <Button onClick={saveEdit}>Save Changes</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deletingId && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 text-red-600 mb-2">
                                <div className="p-3 bg-red-100 rounded-full">
                                    <Trash2 size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">Confirm Delete</h3>
                            </div>
                            <p className="text-slate-600">
                                Are you sure you want to delete this employee? This action cannot be undone and will remove all associated work history.
                            </p>
                            <div className="flex gap-3 justify-end pt-2">
                                <Button variant="secondary" onClick={() => setDeletingId(null)}>Cancel</Button>
                                <Button variant="danger" onClick={() => {
                                    removeEmployee(deletingId);
                                    setDeletingId(null);
                                }}>Delete Everything</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const WorkEntry = () => {
        const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
        const [employeeId, setEmployeeId] = useState('');
        const [hours, setHours] = useState('');
        const [strings, setStrings] = useState('');
        const [startTime, setStartTime] = useState('');
        const [endTime, setEndTime] = useState('');

        useEffect(() => {
            if (startTime && endTime) {
                const start = new Date(`1970-01-01T${startTime}`);
                const end = new Date(`1970-01-01T${endTime}`);
                // Handle potential overnight shifts (assumed end < start means next day)
                let diff = (end - start) / 1000 / 60 / 60;
                if (diff < 0) diff += 24;

                setHours(diff > 0 ? diff.toFixed(2) : '');
            }
        }, [startTime, endTime]);

        // Get selected employee logic
        const selectedEmployee = employees.find(e => e.id === employeeId);
        const activeHourlyRate = selectedEmployee?.hourlyRate !== undefined
            ? selectedEmployee.hourlyRate
            : settings.defaultHourlyRate;

        // Auto-calculate preview
        const salaryPreview = (
            (parseFloat(hours) || 0) * activeHourlyRate +
            (parseFloat(strings) || 0) * settings.defaultUnitPrice
        );

        const handleSubmit = (e) => {
            e.preventDefault();
            if (!employeeId) return alert('Please select an employee');
            if (!hours && !strings) return alert('Please enter hours or strings');

            const amount = parseFloat(hours) || 0;
            const type = amount > 0 ? 'hourly' : 'piece'; // Simplified for log, but we store both effectively if entered

            // We'll create separate records if both are entered, or one combined? 
            // Let's create one record with total salary for simplicity, or complex?
            // "Daily accounting" implies one entry.
            // Let's store the raw inputs.

            addRecord({
                employeeId,
                date,
                type: 'mixed',
                hours: parseFloat(hours) || 0,
                strings: parseFloat(strings) || 0,
                salary: salaryPreview,
                amount: (parseFloat(hours) || 0) + (parseFloat(strings) || 0) // Just for vague display
            });

            // Reset form partially
            setHours('');
            setStrings('');
            setStartTime('');
            setEndTime('');
            // Keep date and employee for rapid entry
        };

        return (
            <Card className="max-w-xl mx-auto p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <CalendarIcon className="text-indigo-500" />
                    Record Work
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        type="date"
                        label="Date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        required
                    />

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-600">Employee</label>
                        <select
                            className="px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white"
                            value={employeeId}
                            onChange={e => setEmployeeId(e.target.value)}
                            required
                        >
                            <option value="">Select Employee...</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="col-span-2 flex items-center gap-2 text-indigo-600 font-medium pb-2 border-b border-indigo-100 mb-2">
                            <Clock size={16} />
                            <span className="text-sm">Time Calculator</span>
                        </div>
                        <TimeSelect
                            label="Start Time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            options={START_TIME_OPTIONS}
                        />
                        <TimeSelect
                            label="End Time"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            options={END_TIME_OPTIONS}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <Input
                            type="number"
                            label={`Hours ($${activeHourlyRate}/hr)`}
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={hours}
                            onChange={e => setHours(e.target.value)}
                        />
                        <Input
                            type="number"
                            label={`Strings ($${settings.defaultUnitPrice}/ea)`}
                            min="0"
                            step="1"
                            placeholder="0"
                            value={strings}
                            onChange={e => setStrings(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div>
                            <p className="text-sm text-slate-500">Estimated Salary</p>
                            <p className="text-2xl font-bold text-indigo-600">${salaryPreview.toFixed(2)}</p>
                        </div>
                        <Button type="submit" className="px-8" disabled={salaryPreview <= 0}>
                            <Save size={18} /> Save Record
                        </Button>
                    </div>
                </form>
            </Card>
        );
    };

    const Settlement = () => {
        return (
            <div className="space-y-6">
                {employees.map(emp => {
                    const empRecords = records.filter(r => r.employeeId === emp.id && !r.paid);
                    const totalEmpUnpaid = empRecords.reduce((sum, r) => sum + r.salary, 0);

                    if (totalEmpUnpaid === 0) return null;

                    return (
                        <Card key={emp.id} className="p-0 overflow-hidden">
                            <div className="p-6 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl">
                                        {getAvatarChar(emp.name)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">{emp.name}</h3>
                                        <p className="text-slate-500">{empRecords.length} unpaid records</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500">Total Due</p>
                                        <p className="text-3xl font-bold text-indigo-600">${totalEmpUnpaid.toFixed(2)}</p>
                                    </div>
                                    <Button variant="success" onClick={() => settleRecords(emp.id)}>
                                        <CheckCircle size={18} /> Mark Paid
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-slate-50 border-t border-slate-100 p-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-slate-600">
                                        <thead>
                                            <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                                                <th className="pb-2">Date</th>
                                                <th className="pb-2">Details</th>
                                                <th className="pb-2 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {empRecords.map(r => (
                                                <tr key={r.id}>
                                                    <td className="py-2">{formatDateWithWeekday(r.date)}</td>
                                                    <td className="py-2">
                                                        {r.hours > 0 && <span>{r.hours} hrs </span>}
                                                        {r.hours > 0 && r.strings > 0 && <span>+ </span>}
                                                        {r.strings > 0 && <span>{r.strings} strings</span>}
                                                    </td>
                                                    <td className="py-2 text-right font-medium">${r.salary.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Card>
                    );
                })}
                {unpaidRecords.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">All Settled!</h3>
                        <p className="text-slate-500 mt-2">There are no unpaid records at the moment.</p>
                    </div>
                )}
            </div>
        );
    };

    const HistoryView = () => {
        const [filterEmpId, setFilterEmpId] = useState('');
        const [startDate, setStartDate] = useState('');
        const [endDate, setEndDate] = useState('');
        const [editingId, setEditingId] = useState(null);

        // Edit State
        const [editForm, setEditForm] = useState({
            date: '',
            hours: '',
            strings: '',
            salary: ''
        });

        const filteredRecords = records.filter(r => {
            const matchesEmp = !filterEmpId || r.employeeId === filterEmpId;
            const matchesStart = !startDate || r.date >= startDate;
            const matchesEnd = !endDate || r.date <= endDate;
            return matchesEmp && matchesStart && matchesEnd;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        const startEditing = (record) => {
            setEditingId(record.id);
            setEditForm({
                date: record.date,
                hours: record.hours || 0,
                strings: record.strings || 0,
                salary: record.salary
            });
        };

        const handleEditChange = (field, value) => {
            const newForm = { ...editForm, [field]: value };

            // Auto-calc salary if hours/strings change
            if (field === 'hours' || field === 'strings') {
                const rec = records.find(r => r.id === editingId);
                const emp = employees.find(e => e.id === rec.employeeId);
                const rate = emp?.hourlyRate ?? settings.defaultHourlyRate;
                const unit = settings.defaultUnitPrice;

                const h = parseFloat(field === 'hours' ? value : newForm.hours) || 0;
                const s = parseFloat(field === 'strings' ? value : newForm.strings) || 0;

                newForm.salary = (h * rate + s * unit).toFixed(2);
            }
            setEditForm(newForm);
        };

        const saveRecordEdit = async () => {
            const h = parseFloat(editForm.hours) || 0;
            const s = parseFloat(editForm.strings) || 0;
            const sal = parseFloat(editForm.salary) || 0;

            let type = 'hourly';
            let amount = h;
            if (h > 0 && s > 0) { type = 'mixed'; amount = h + s; }
            else if (s > 0) { type = 'piece'; amount = s; }

            const updates = {
                date: editForm.date,
                hours: h,
                strings: s,
                salary: sal,
                type: type,
                amount: amount
            };

            await updateRecord(editingId, updates);
            setEditingId(null);
        };

        return (
            <div className="space-y-6">
                <Card className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-sm font-medium text-slate-600">Employee</label>
                            <div className="relative">
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white appearance-none cursor-pointer"
                                    value={filterEmpId}
                                    onChange={e => setFilterEmpId(e.target.value)}
                                >
                                    <option value="">All Employees</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>
                        <Input type="date" label="From" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <Input type="date" label="To" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        <div className="flex-none">
                            <Button variant="secondary" onClick={() => { setFilterEmpId(''); setStartDate(''); setEndDate(''); }} className="mb-0.5">Clear</Button>
                        </div>
                    </div>
                </Card>

                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Employee</th>
                                    <th className="p-4">Content</th>
                                    <th className="p-4">Salary</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRecords.map(r => {
                                    const emp = employees.find(e => e.id === r.employeeId);
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/50">
                                            <td className="p-4">{formatDateWithWeekday(r.date)}</td>
                                            <td className="p-4 font-medium text-slate-700">{emp?.name || 'Unknown'}</td>
                                            <td className="p-4">
                                                {r.hours > 0 && <span className="mr-2">{r.hours}h</span>}
                                                {r.strings > 0 && <span>{r.strings}pcs</span>}
                                            </td>
                                            <td className="p-4 font-bold text-slate-700">${r.salary.toFixed(2)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {r.paid ? 'Paid' : 'Unpaid'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => startEditing(r)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors" title="Edit">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => deleteRecord(r.id)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors" title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredRecords.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-slate-400">No records found matching filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {editingId && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                            <h3 className="text-xl font-bold text-slate-800">Edit Record</h3>
                            <Input type="date" label="Date" value={editForm.date} onChange={e => handleEditChange('date', e.target.value)} />
                            <div className="grid grid-cols-2 gap-4">
                                <Input type="number" label="Hours" value={editForm.hours} onChange={e => handleEditChange('hours', e.target.value)} />
                                <Input type="number" label="Strings" value={editForm.strings} onChange={e => handleEditChange('strings', e.target.value)} />
                            </div>
                            <Input type="number" label="Salary (Override)" value={editForm.salary} onChange={e => handleEditChange('salary', e.target.value)} />
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                                <Button onClick={saveRecordEdit}>Save Changes</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const Config = () => (
        <>
            <Card className="max-w-xl mx-auto p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Settings className="text-slate-600" />
                    Parameters
                </h3>
                <div className="space-y-6">
                    <Input
                        type="number"
                        label="Default Hourly Rate ($/hr) for New Employees"
                        step="0.01"
                        value={settings.defaultHourlyRate}
                        onChange={e => setSettings({ ...settings, defaultHourlyRate: parseFloat(e.target.value) || 0 })}
                    />
                    <Input
                        type="number"
                        label="Per String/Piece Price ($/unit)"
                        step="0.01"
                        value={settings.defaultUnitPrice}
                        onChange={e => setSettings({ ...settings, defaultUnitPrice: parseFloat(e.target.value) || 0 })}
                    />
                    <div className="p-4 bg-indigo-50 text-indigo-700 rounded-lg text-sm">
                        <p><strong>Note:</strong> Changes here apply to future records only. Existing records retain their calculated values.</p>
                    </div>
                </div>
            </Card>

            <Card className="max-w-xl mx-auto p-6 mt-6">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Download className="text-slate-600" />
                    Data Management
                </h3>
                <div className="space-y-6">
                    <p className="text-sm text-slate-600">Export all work records and payment history to a CSV file for your records or external processing.</p>
                    <Button onClick={exportData} variant="secondary" className="w-full justify-center">
                        <Download size={18} /> Export Data to CSV
                    </Button>
                </div>
            </Card>
        </>
    );

    // --- Layout ---

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <PieChart size={18} /> },
        { id: 'entry', label: 'Work Log', icon: <Plus size={18} /> },
        { id: 'history', label: 'History', icon: <History size={18} /> },
        { id: 'employees', label: 'Employees', icon: <Users size={18} /> },
        { id: 'settlement', label: 'Settlement', icon: <CreditCard size={18} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
    ];

    return (
        <div className="pb-20">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">耿阿姨烧烤店薪资管理系统</h1>
                    <p className="text-slate-500 mt-1">工时统计与薪资结算</p>
                </div>

                {/* Mobile Tab Select could go here if needed, but we'll stick to a simple pill nav */}
            </header>

            <nav className="flex overflow-x-auto gap-2 mb-8 p-1 bg-slate-100 rounded-xl">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </nav>

            <div className="transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'employees' && <EmployeeManager />}
                {activeTab === 'entry' && <WorkEntry />}
                {activeTab === 'history' && <HistoryView />}
                {activeTab === 'settlement' && <Settlement />}
                {activeTab === 'settings' && <Config />}
            </div>
        </div>
    );
};

export default SalaryManager;
