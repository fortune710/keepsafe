import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { Check } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';

interface FutureDatePickerProps {
  value: string; // ISO date string, "YYYY-MM-DD"
  onChange: (isoDate: string) => void;
  yearsAhead?: number;
}

interface DateSelectProps {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onSelect: (value: number) => void;
}

function DateSelect({ label, value, options, onSelect }: DateSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={styles.selectContainer}>
      <TouchableOpacity style={styles.selectButton} onPress={() => setIsOpen(true)}>
        <Text style={styles.selectButtonText}>{selectedOption?.label || 'Select'}</Text>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsOpen(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionItem, value === option.value && styles.optionItemSelected]}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, value === option.value && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                  {value === option.value && <Check color="#8B5CF6" size={20} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Month/Day/Year scroll picker adapted from birthday-update-form.tsx's DateSelect, but
 * constrained so the resulting date must be strictly after today (a time capsule's
 * unlock_at must be in the future) instead of birthday's ~80-years-back range.
 */
export function FutureDatePicker({ value, onChange, yearsAhead = 10 }: FutureDatePickerProps) {
  const minDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }, []);

  const parsed = useMemo(() => {
    const [yearStr, monthStr, dayStr] = (value || '').split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { year, month, day };
    }
    return { year: minDate.getFullYear(), month: minDate.getMonth() + 1, day: minDate.getDate() };
  }, [value, minDate]);

  const [year, setYear] = useState(parsed.year);
  const [month, setMonth] = useState(parsed.month);
  const [day, setDay] = useState(parsed.day);

  const yearOptions = useMemo(() => {
    const startYear = minDate.getFullYear();
    const years = [];
    for (let i = 0; i <= yearsAhead; i++) {
      const yearValue = startYear + i;
      years.push({ value: yearValue, label: yearValue.toString() });
    }
    return years;
  }, [minDate, yearsAhead]);

  const minMonthForYear = (y: number) => (y === minDate.getFullYear() ? minDate.getMonth() + 1 : 1);

  const monthOptions = useMemo(() => {
    const firstAllowedMonth = minMonthForYear(year);
    return MONTH_LABELS
      .map((label, index) => ({ value: index + 1, label }))
      .filter((option) => option.value >= firstAllowedMonth);
  }, [year, minDate]);

  const minDayForYearMonth = (y: number, m: number) =>
    y === minDate.getFullYear() && m === minDate.getMonth() + 1 ? minDate.getDate() : 1;

  const dayOptions = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstAllowedDay = minDayForYearMonth(year, month);
    const days = [];
    for (let i = firstAllowedDay; i <= daysInMonth; i++) {
      days.push({ value: i, label: i.toString() });
    }
    return days;
  }, [year, month, minDate]);

  const commit = (nextYear: number, nextMonth: number, nextDay: number) => {
    const iso = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
    onChange(iso);
  };

  const handleYearChange = (newYear: number) => {
    const firstAllowedMonth = minMonthForYear(newYear);
    const clampedMonth = Math.max(month, firstAllowedMonth);
    const firstAllowedDay = minDayForYearMonth(newYear, clampedMonth);
    const maxDay = new Date(newYear, clampedMonth, 0).getDate();
    const clampedDay = Math.min(Math.max(day, firstAllowedDay), maxDay);

    setYear(newYear);
    setMonth(clampedMonth);
    setDay(clampedDay);
    commit(newYear, clampedMonth, clampedDay);
  };

  const handleMonthChange = (newMonth: number) => {
    const firstAllowedDay = minDayForYearMonth(year, newMonth);
    const maxDay = new Date(year, newMonth, 0).getDate();
    const clampedDay = Math.min(Math.max(day, firstAllowedDay), maxDay);

    setMonth(newMonth);
    setDay(clampedDay);
    commit(year, newMonth, clampedDay);
  };

  const handleDayChange = (newDay: number) => {
    setDay(newDay);
    commit(year, month, newDay);
  };

  return (
    <View style={styles.container}>
      <View style={styles.selectsContainer}>
        <DateSelect label="Month" value={month} options={monthOptions} onSelect={handleMonthChange} />
        <DateSelect label="Day" value={day} options={dayOptions} onSelect={handleDayChange} />
        <DateSelect label="Year" value={year} options={yearOptions} onSelect={handleYearChange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  selectsContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  selectContainer: {
    alignSelf: 'flex-start',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: scale(50),
  },
  selectButtonText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionItemSelected: {
    backgroundColor: '#F8FAFC',
  },
  optionText: {
    fontSize: 16,
    color: '#1E293B',
  },
  optionTextSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
});
