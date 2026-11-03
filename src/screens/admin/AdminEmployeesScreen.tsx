import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import {
  AdminEmployeeItem,
  AdminEmployeeFormInput,
  AdminEmployeeUpdateInput,
} from '../../types/admin';

export const AdminEmployeesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [employees, setEmployees] = useState<AdminEmployeeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'EMPLOYEE' | 'ADMIN' | 'INACTIVE'>('ALL');

  // Modals state
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<AdminEmployeeItem | null>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPersonalEmailSameAsWork, setIsPersonalEmailSameAsWork] = useState<boolean>(false);

  // Add Employee Form State
  const [addForm, setAddForm] = useState<AdminEmployeeFormInput>({
    customId: '',
    firstName: '',
    lastName: '',
    email: '',
    personalEmail: '',
    phone: '',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'Full-time',
    workLocation: 'Chinar Park, Teghoria, Kolkata (In-Office)',
    role: 'EMPLOYEE',
    salary: 0,
  });

  // Edit Employee Form State
  const [editForm, setEditForm] = useState<AdminEmployeeUpdateInput>({
    firstName: '',
    lastName: '',
    email: '',
    personalEmail: '',
    phone: '',
    designation: '',
    employmentType: 'Full-time',
    workLocation: 'Chinar Park, Teghoria, Kolkata (In-Office)',
    role: 'EMPLOYEE',
    salary: 0,
    isActive: true,
    newPassword: '',
  });

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const res = await adminService.getEmployeesList();
    if (res.success && res.employees) {
      setEmployees(res.employees);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormError(null);
    setIsPersonalEmailSameAsWork(false);
    setAddForm({
      customId: '',
      firstName: '',
      lastName: '',
      email: '',
      personalEmail: '',
      phone: '',
      designation: '',
      joiningDate: new Date().toISOString().split('T')[0],
      employmentType: 'Full-time',
      workLocation: 'Chinar Park, Teghoria, Kolkata (In-Office)',
      role: 'EMPLOYEE',
      salary: 0,
    });
    setIsAddModalVisible(true);
  };

  // Submit Add Employee
  const handleAddSubmit = async () => {
    setFormError(null);
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) {
      setFormError('Please enter both First Name and Last Name.');
      return;
    }
    if (!addForm.email.trim() || !addForm.email.includes('@')) {
      setFormError('Please enter a valid work email address.');
      return;
    }

    const finalPersonalEmail = isPersonalEmailSameAsWork
      ? addForm.email.trim().toLowerCase()
      : (addForm.personalEmail || '').trim().toLowerCase();

    if (!finalPersonalEmail || !finalPersonalEmail.includes('@')) {
      setFormError('Please enter a valid personal email address for credentials dispatch.');
      return;
    }
    if (!addForm.phone.trim()) {
      setFormError('Please enter contact phone number.');
      return;
    }
    if (!addForm.designation.trim()) {
      setFormError('Please enter employee designation/role.');
      return;
    }

    setIsSubmitting(true);
    const res = await adminService.createEmployee({
      ...addForm,
      email: addForm.email.trim().toLowerCase(),
      personalEmail: finalPersonalEmail,
    });
    setIsSubmitting(false);

    if (res.success) {
      setIsAddModalVisible(false);
      const empId = res.employee?.id || 'Staff';
      const tempPassMsg = res.rawPassword ? `\nTemporary Password: ${res.rawPassword}` : '';
      Alert.alert(
        'Staff Onboarded Successfully',
        `Employee ${addForm.firstName} ${addForm.lastName} (${empId}) has been added.\n\nPersonal Email: ${finalPersonalEmail}${tempPassMsg}\n\nOnboarding credentials and app link will be sent to this personal email address. Leave quotas for 2026 have been initialized.`,
        [{ text: 'OK', onPress: fetchEmployees }]
      );
    } else {
      setFormError(res.error || 'Failed to create employee.');
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (emp: AdminEmployeeItem) => {
    setSelectedEmployee(emp);
    setFormError(null);
    setEditForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      personalEmail: emp.personalEmail || '',
      phone: emp.phone,
      designation: emp.designation,
      employmentType: emp.employmentType,
      workLocation: emp.workLocation,
      role: emp.role,
      salary: emp.salary || 0,
      isActive: emp.isActive !== false,
      newPassword: '',
    });
    setIsEditModalVisible(true);
  };

  // Submit Edit Employee
  const handleEditSubmit = async () => {
    if (!selectedEmployee) return;
    setFormError(null);

    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setFormError('Please enter both First Name and Last Name.');
      return;
    }
    if (!editForm.email.trim() || !editForm.email.includes('@')) {
      setFormError('Please enter a valid work email.');
      return;
    }

    setIsSubmitting(true);
    const res = await adminService.updateEmployee(selectedEmployee.id, editForm);
    setIsSubmitting(false);

    if (res.success) {
      setIsEditModalVisible(false);
      Alert.alert(
        'Changes Saved',
        `Details for ${editForm.firstName} ${editForm.lastName} (${selectedEmployee.id}) updated.`,
        [{ text: 'OK', onPress: fetchEmployees }]
      );
    } else {
      setFormError(res.error || 'Failed to update employee.');
    }
  };

  // Filtered list - STRICTLY EXCLUDE currently logged-in admin!
  const filteredEmployees = employees.filter((emp) => {
    // 1. Never show the currently logged-in admin in the employee directory list
    if (user?.id && emp.id === user.id) return false;
    if (user?.email && emp.email.toLowerCase() === user.email.toLowerCase()) return false;

    // 2. Search query filter
    const query = searchQuery.toLowerCase().trim();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const matchesSearch =
      !query ||
      fullName.includes(query) ||
      emp.id.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.designation.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // 3. Tab filter
    if (roleFilter === 'EMPLOYEE') return emp.role === 'EMPLOYEE' && emp.isActive;
    if (roleFilter === 'ADMIN') return emp.role === 'ADMIN' && emp.isActive;
    if (roleFilter === 'INACTIVE') return !emp.isActive;

    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Safe Area Header */}
      <View
        style={{
          paddingTop: insets.top + (Platform.OS === 'ios' ? 4 : 8),
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-xl font-black text-slate-900">
              Staff Directory
            </Text>
            <Text className="text-xs text-slate-500 font-medium">
              Manage organization members, profiles & compensation
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleOpenAddModal}
            activeOpacity={0.8}
            className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 shadow-sm"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">Add Staff</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 mt-1">
          <Ionicons name="search" size={16} color="#64748B" />
          <TextInput
            placeholder="Search by name, ID, email, or designation..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-xs text-slate-900 font-medium p-0"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2.5 flex-row gap-2">
          {[
            { key: 'ALL', label: `All Staff (${filteredEmployees.length})` },
            { key: 'EMPLOYEE', label: 'Employees' },
            { key: 'ADMIN', label: 'Other Admins' },
            { key: 'INACTIVE', label: 'Inactive' },
          ].map((pill) => {
            const isActive = roleFilter === pill.key;
            return (
              <TouchableOpacity
                key={pill.key}
                onPress={() => setRoleFilter(pill.key as any)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: isActive ? '#4F46E5' : '#F1F5F9',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 14,
                  marginRight: 6,
                }}
              >
                <Text
                  style={{
                    color: isActive ? '#FFFFFF' : '#64748B',
                    fontSize: 11,
                    fontWeight: isActive ? '700' : '600',
                  }}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
      >
        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text className="text-xs font-semibold text-slate-500 mt-3">
              Loading staff directory...
            </Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white rounded-2xl border border-slate-200 p-6">
            <Ionicons name="people-outline" size={40} color="#94A3B8" />
            <Text className="text-sm font-bold text-slate-700 mt-2">
              No staff members found
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-1">
              Tap "+ Add Staff" above to onboard your first employee.
            </Text>
          </View>
        ) : (
          <View className="space-y-3 gap-3">
            {filteredEmployees.map((emp) => (
              <View
                key={emp.id}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
              >
                {/* Employee Header */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-3 flex-1">
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: emp.role === 'ADMIN' ? '#EEF2FF' : '#F1F5F9',
                        borderColor: emp.role === 'ADMIN' ? '#C7D2FE' : '#E2E8F0',
                        borderWidth: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '800',
                          color: emp.role === 'ADMIN' ? '#4338CA' : '#475569',
                        }}
                      >
                        {emp.firstName ? emp.firstName[0] : 'E'}
                        {emp.lastName ? emp.lastName[0] : ''}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
                          {emp.firstName} {emp.lastName}
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 4,
                            backgroundColor: emp.role === 'ADMIN' ? '#EEF2FF' : '#F1F5F9',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9.5,
                              fontWeight: '700',
                              color: emp.role === 'ADMIN' ? '#4F46E5' : '#64748B',
                            }}
                          >
                            {emp.role}
                          </Text>
                        </View>
                      </View>

                      <Text className="text-xs text-slate-500 font-medium mt-0.5">
                        {emp.id} • {emp.designation}
                      </Text>
                    </View>
                  </View>

                  {/* Active / Inactive badge */}
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: emp.isActive ? '#DCFCE7' : '#F1F5F9',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: emp.isActive ? '#15803D' : '#94A3B8',
                      }}
                    >
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                {/* Details Grid */}
                <View className="p-3 bg-slate-50 rounded-xl space-y-2 gap-2 mb-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="cash-outline" size={14} color="#059669" />
                      <Text className="text-xs text-slate-600 font-medium">Monthly Gross Salary</Text>
                    </View>
                    <Text className="text-xs font-black text-slate-900">
                      ₹{(emp.salary || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="mail-outline" size={14} color="#64748B" />
                      <Text className="text-xs text-slate-600 font-medium">Work Email</Text>
                    </View>
                    <Text className="text-xs text-slate-700 font-semibold">{emp.email}</Text>
                  </View>

                  {emp.personalEmail ? (
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="mail" size={14} color="#2563EB" />
                        <Text className="text-xs text-slate-600 font-medium">Personal Email</Text>
                      </View>
                      <Text className="text-xs text-blue-700 font-semibold">{emp.personalEmail}</Text>
                    </View>
                  ) : null}

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="call-outline" size={14} color="#64748B" />
                      <Text className="text-xs text-slate-600 font-medium">Phone</Text>
                    </View>
                    <Text className="text-xs text-slate-700 font-semibold">{emp.phone}</Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="briefcase-outline" size={14} color="#64748B" />
                      <Text className="text-xs text-slate-600 font-medium">Employment</Text>
                    </View>
                    <Text className="text-xs text-slate-700 font-semibold">{emp.employmentType}</Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text className="text-xs text-slate-600 font-medium">Workplace</Text>
                    </View>
                    <Text className="text-xs text-slate-700 font-medium text-right flex-1 ml-4" numberOfLines={1}>
                      {emp.workLocation}
                    </Text>
                  </View>
                </View>

                {/* Edit Button */}
                <View className="flex-row items-center justify-end gap-2 pt-1">
                  <TouchableOpacity
                    onPress={() => handleOpenEditModal(emp)}
                    activeOpacity={0.7}
                    className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200"
                  >
                    <Ionicons name="create-outline" size={14} color="#334155" />
                    <Text className="text-xs font-bold text-slate-700">Edit Profile & Salary</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW EMPLOYEE (Full-width, spacious, comfortable fields) */}
      {/* ========================================================================= */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        >
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200">
            <View>
              <Text className="text-lg font-black text-slate-900">Onboard New Staff Member</Text>
              <Text className="text-xs text-slate-500 font-medium">
                Enter details, salary, and initial credentials
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsAddModalVisible(false)}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-5 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
          >
            {formError && (
              <View className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={18} color="#E11D48" />
                <Text className="text-xs font-bold text-rose-700 flex-1">{formError}</Text>
              </View>
            )}

            {/* SECTION 1: Personal & Contact Information */}
            <View className="mb-5">
              <View className="flex-row items-center gap-1.5 mb-3">
                <Ionicons name="person" size={15} color="#4F46E5" />
                <Text className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Personal Information
                </Text>
              </View>

              {/* First Name - Full Width */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">First Name *</Text>
                <TextInput
                  placeholder="e.g. Rahul"
                  placeholderTextColor="#94A3B8"
                  value={addForm.firstName}
                  onChangeText={(t) => setAddForm({ ...addForm, firstName: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              {/* Last Name - Full Width */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Last Name *</Text>
                <TextInput
                  placeholder="e.g. Sharma"
                  placeholderTextColor="#94A3B8"
                  value={addForm.lastName}
                  onChangeText={(t) => setAddForm({ ...addForm, lastName: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              {/* Work Email - Full Width */}
              <View className="mb-2">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Official Work Email *</Text>
                <TextInput
                  placeholder="rahul.sharma@autocomputation.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={addForm.email}
                  onChangeText={(t) =>
                    setAddForm((prev) => ({
                      ...prev,
                      email: t,
                      personalEmail: isPersonalEmailSameAsWork ? t : prev.personalEmail,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              {/* Checkbox: Personal Email Same as Work Email */}
              <TouchableOpacity
                onPress={() => {
                  const nextVal = !isPersonalEmailSameAsWork;
                  setIsPersonalEmailSameAsWork(nextVal);
                  if (nextVal) {
                    setAddForm((prev) => ({ ...prev, personalEmail: prev.email }));
                  }
                }}
                activeOpacity={0.8}
                className="flex-row items-center gap-2 mb-3 mt-1"
              >
                <Ionicons
                  name={isPersonalEmailSameAsWork ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={isPersonalEmailSameAsWork ? '#4F46E5' : '#94A3B8'}
                />
                <Text className="text-xs font-semibold text-slate-700">
                  Personal email is same as work email
                </Text>
              </TouchableOpacity>

              {/* Personal Email - Onboarding & App Link Dispatch */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Personal Email Address *</Text>
                <TextInput
                  placeholder="e.g. sujaykumarkotal49@gmail.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isPersonalEmailSameAsWork}
                  value={isPersonalEmailSameAsWork ? addForm.email : addForm.personalEmail}
                  onChangeText={(t) => setAddForm({ ...addForm, personalEmail: t })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium ${
                    isPersonalEmailSameAsWork
                      ? 'bg-slate-100 border-slate-200 text-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <View className="flex-row items-start gap-2 mt-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
                  <Ionicons name="information-circle" size={16} color="#2563EB" style={{ marginTop: 1 }} />
                  <Text className="text-[11px] text-blue-700 font-medium flex-1 leading-4">
                    The employee will receive their onboarding login credentials and app download link at this personal email address.
                  </Text>
                </View>
              </View>

              {/* Phone - Full Width */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Contact Phone Number *</Text>
                <TextInput
                  placeholder="+91 9876543210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={addForm.phone}
                  onChangeText={(t) => setAddForm({ ...addForm, phone: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>
            </View>

            {/* SECTION 2: Position & Compensation */}
            <View className="mb-5 pt-3 border-t border-slate-200">
              <View className="flex-row items-center gap-1.5 mb-3">
                <Ionicons name="briefcase" size={15} color="#059669" />
                <Text className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Position & Compensation
                </Text>
              </View>

              {/* Designation - Full Width */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Job Designation *</Text>
                <TextInput
                  placeholder="e.g. Senior Frontend Developer"
                  placeholderTextColor="#94A3B8"
                  value={addForm.designation}
                  onChangeText={(t) => setAddForm({ ...addForm, designation: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              {/* Monthly Salary - Full Width */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Monthly Gross Salary (₹) *</Text>
                <View className="flex-row items-center px-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <Text className="text-base font-bold text-slate-500 mr-2">₹</Text>
                  <TextInput
                    placeholder="e.g. 50000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={addForm.salary ? String(addForm.salary) : ''}
                    onChangeText={(t) => setAddForm({ ...addForm, salary: parseFloat(t) || 0 })}
                    className="flex-1 text-sm text-slate-900 font-semibold py-2"
                  />
                </View>
                <Text className="text-[11px] text-slate-500 mt-1">
                  Salary is used exclusively for salary deduction calculations on unapproved half-days.
                </Text>
              </View>

              {/* Employment Type Selector Pills */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Employment Agreement</Text>
                <View className="flex-row gap-2">
                  {(['Full-time', 'Contract', 'Part-time'] as const).map((type) => {
                    const isSelected = addForm.employmentType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setAddForm({ ...addForm, employmentType: type })}
                        className={`flex-1 py-2.5 rounded-xl items-center border ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-white' : 'text-slate-600'
                          }`}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Work Location - Full Width */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Workplace Location</Text>
                <TextInput
                  value={addForm.workLocation}
                  onChangeText={(t) => setAddForm({ ...addForm, workLocation: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>
            </View>

            {/* SECTION 3: Account Security & System Role */}
            <View className="mb-6 pt-3 border-t border-slate-200">
              <View className="flex-row items-center gap-1.5 mb-3">
                <Ionicons name="shield-checkmark" size={15} color="#D97706" />
                <Text className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Account Credentials & Role
                </Text>
              </View>

              {/* Role Toggle Cards */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">System Portal Role</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setAddForm({ ...addForm, role: 'EMPLOYEE' })}
                    className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${
                      addForm.role === 'EMPLOYEE'
                        ? 'bg-indigo-50 border-indigo-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Ionicons
                      name="person"
                      size={16}
                      color={addForm.role === 'EMPLOYEE' ? '#4F46E5' : '#64748B'}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        addForm.role === 'EMPLOYEE' ? 'text-indigo-900' : 'text-slate-600'
                      }`}
                    >
                      Employee
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAddForm({ ...addForm, role: 'ADMIN' })}
                    className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${
                      addForm.role === 'ADMIN'
                        ? 'bg-indigo-50 border-indigo-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Ionicons
                      name="key"
                      size={16}
                      color={addForm.role === 'ADMIN' ? '#4F46E5' : '#64748B'}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        addForm.role === 'ADMIN' ? 'text-indigo-900' : 'text-slate-600'
                      }`}
                    >
                      Administrator
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Employee ID - Full Width */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">
                  Custom Staff ID (Optional)
                </Text>
                <TextInput
                  placeholder="e.g. EMP-025 (leave empty to auto-assign)"
                  placeholderTextColor="#94A3B8"
                  value={addForm.customId}
                  onChangeText={(t) => setAddForm({ ...addForm, customId: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              {/* Auto-Generated Credentials Notice */}
              <View className="mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex-row items-start gap-2">
                <Ionicons name="key-outline" size={16} color="#4F46E5" style={{ marginTop: 1 }} />
                <Text className="text-[11px] text-indigo-800 font-medium flex-1 leading-4">
                  Initial portal password will be automatically generated by the system and displayed upon onboarding for dispatch to the employee.
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleAddSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-indigo-600 items-center justify-center shadow-md mb-6"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-bold text-white tracking-wide">
                  Complete Onboarding & Save Staff
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT EMPLOYEE (Spacious, full-width inputs) */}
      {/* ========================================================================= */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        >
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200">
            <View>
              <Text className="text-lg font-black text-slate-900">
                Edit Staff: {selectedEmployee?.id}
              </Text>
              <Text className="text-xs text-slate-500 font-medium">
                Update compensation, profile & permissions
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditModalVisible(false)}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-5 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
          >
            {formError && (
              <View className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={18} color="#E11D48" />
                <Text className="text-xs font-bold text-rose-700 flex-1">{formError}</Text>
              </View>
            )}

            {/* Active Status Switch Card */}
            <View className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex-row items-center justify-between mb-5">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-bold text-slate-800">Employment Active Status</Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  When inactive, employee cannot log in or record attendance
                </Text>
              </View>
              <Switch
                value={editForm.isActive}
                onValueChange={(v) => setEditForm({ ...editForm, isActive: v })}
                trackColor={{ false: '#CBD5E1', true: '#4F46E5' }}
              />
            </View>

            {/* SECTION 1: Personal Details */}
            <View className="mb-5">
              <View className="flex-row items-center gap-1.5 mb-3">
                <Ionicons name="person" size={15} color="#4F46E5" />
                <Text className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Profile Information
                </Text>
              </View>

              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">First Name *</Text>
                <TextInput
                  value={editForm.firstName}
                  onChangeText={(t) => setEditForm({ ...editForm, firstName: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Last Name *</Text>
                <TextInput
                  value={editForm.lastName}
                  onChangeText={(t) => setEditForm({ ...editForm, lastName: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Official Work Email *</Text>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={editForm.email}
                  onChangeText={(t) => setEditForm({ ...editForm, email: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Personal Email Address</Text>
                <TextInput
                  placeholder="e.g. sujaykumarkotal49@gmail.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={editForm.personalEmail}
                  onChangeText={(t) => setEditForm({ ...editForm, personalEmail: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Phone Number *</Text>
                <TextInput
                  keyboardType="phone-pad"
                  value={editForm.phone}
                  onChangeText={(t) => setEditForm({ ...editForm, phone: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>
            </View>

            {/* SECTION 2: Position & Compensation */}
            <View className="mb-5 pt-3 border-t border-slate-200">
              <View className="flex-row items-center gap-1.5 mb-3">
                <Ionicons name="briefcase" size={15} color="#059669" />
                <Text className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Role & Compensation
                </Text>
              </View>

              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Designation</Text>
                <TextInput
                  value={editForm.designation}
                  onChangeText={(t) => setEditForm({ ...editForm, designation: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              {/* Monthly Salary Input */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Monthly Gross Salary (₹)</Text>
                <View className="flex-row items-center px-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <Text className="text-base font-bold text-slate-500 mr-2">₹</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={editForm.salary ? String(editForm.salary) : ''}
                    onChangeText={(t) => setEditForm({ ...editForm, salary: parseFloat(t) || 0 })}
                    className="flex-1 text-sm text-slate-900 font-semibold py-2"
                  />
                </View>
              </View>

              {/* Employment Type Pills */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Employment Type</Text>
                <View className="flex-row gap-2">
                  {(['Full-time', 'Contract', 'Part-time'] as const).map((type) => {
                    const isSelected = editForm.employmentType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setEditForm({ ...editForm, employmentType: type })}
                        className={`flex-1 py-2.5 rounded-xl items-center border ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-white' : 'text-slate-600'
                          }`}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Workplace Location</Text>
                <TextInput
                  value={editForm.workLocation}
                  onChangeText={(t) => setEditForm({ ...editForm, workLocation: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>
            </View>

            {/* SECTION 3: System Role & Password Reset */}
            <View className="mb-6 pt-3 border-t border-slate-200">
              <View className="flex-row items-center gap-1.5 mb-3">
                <Ionicons name="key" size={15} color="#D97706" />
                <Text className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Access & Security
                </Text>
              </View>

              {/* Role Cards */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Portal Role</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setEditForm({ ...editForm, role: 'EMPLOYEE' })}
                    className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${
                      editForm.role === 'EMPLOYEE'
                        ? 'bg-indigo-50 border-indigo-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Ionicons
                      name="person"
                      size={16}
                      color={editForm.role === 'EMPLOYEE' ? '#4F46E5' : '#64748B'}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        editForm.role === 'EMPLOYEE' ? 'text-indigo-900' : 'text-slate-600'
                      }`}
                    >
                      Employee
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setEditForm({ ...editForm, role: 'ADMIN' })}
                    className={`flex-1 p-3 rounded-xl border flex-row items-center justify-center gap-2 ${
                      editForm.role === 'ADMIN'
                        ? 'bg-indigo-50 border-indigo-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Ionicons
                      name="key"
                      size={16}
                      color={editForm.role === 'ADMIN' ? '#4F46E5' : '#64748B'}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        editForm.role === 'ADMIN' ? 'text-indigo-900' : 'text-slate-600'
                      }`}
                    >
                      Administrator
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Reset */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">
                  Reset Password (Leave blank to keep unchanged)
                </Text>
                <TextInput
                  placeholder="Enter new password if resetting"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  value={editForm.newPassword}
                  onChangeText={(t) => setEditForm({ ...editForm, newPassword: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleEditSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-indigo-600 items-center justify-center shadow-md mb-6"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-sm font-bold text-white tracking-wide">
                  Save Employee Changes
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
