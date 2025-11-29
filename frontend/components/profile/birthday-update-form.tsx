import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useProfileOperations } from '@/hooks/use-profile-operations';
import { scale, verticalScale } from 'react-native-size-matters';

interface BirthdayUpdateFormProps {
  currentValue: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose: () => void;
}

interface DateSelectProps {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onSelect: (value: number) => void;
}

function DateSelect({ label, value, options, onSelect }: DateSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={styles.selectContainer}>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setIsOpen(true)}
      >
        <Text style={styles.selectButtonText}>
          {selectedOption?.label || 'Select'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />
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
                  style={[
                    styles.optionItem,
                    value === option.value && styles.optionItemSelected
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    value === option.value && styles.optionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Check color="#8B5CF6" size={20} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function BirthdayUpdateForm({ currentValue, onSuccess, onError, onClose }: BirthdayUpdateFormProps) {
  const currentDate = useMemo(() => {
    if (currentValue) {
      const parsed = new Date(currentValue);
      if (!isNaN(parsed.getTime())) {
        return {
          year: parsed.getFullYear(),
          month: parsed.getMonth() + 1,
          day: parsed.getDate()
        };
      }
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate()
    };
  }, [currentValue]);

  const [year, setYear] = useState(currentDate.year);
  const [month, setMonth] = useState(currentDate.month);
  const [day, setDay] = useState(currentDate.day);
  
  const { updateProfile, isLoading } = useProfileOperations();

  // Generate year options (last 80 years from current year)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 80; i++) {
      const yearValue = currentYear - i;
      years.push({ value: yearValue, label: yearValue.toString() });
    }
    return years;
  }, []);

  // Generate month options
  const monthOptions = useMemo(() => {
    const months = [
      { value: 1, label: 'January' },
      { value: 2, label: 'February' },
      { value: 3, label: 'March' },
      { value: 4, label: 'April' },
      { value: 5, label: 'May' },
      { value: 6, label: 'June' },
      { value: 7, label: 'July' },
      { value: 8, label: 'August' },
      { value: 9, label: 'September' },
      { value: 10, label: 'October' },
      { value: 11, label: 'November' },
      { value: 12, label: 'December' },
    ];
    return months;
  }, []);

  // Generate day options based on selected month and year
  const dayOptions = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ value: i, label: i.toString() });
    }
    return days;
  }, [year, month]);

  // Adjust day if it's invalid for the selected month/year (e.g., Feb 30)
  const adjustedDay = useMemo(() => {
    const maxDay = new Date(year, month, 0).getDate();
    return day > maxDay ? maxDay : day;
  }, [year, month, day]);

  // Handlers that adjust day when month/year changes
  const handleMonthChange = (newMonth: number) => {
    setMonth(newMonth);
    const maxDay = new Date(year, newMonth, 0).getDate();
    if (day > maxDay) {
      setDay(maxDay);
    }
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    const maxDay = new Date(newYear, month, 0).getDate();
    if (day > maxDay) {
      setDay(maxDay);
    }
  };

  const isValid = year > 0 && month > 0 && adjustedDay > 0;

  const handleSave = async () => {
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(adjustedDay).padStart(2, '0')}`;

    const result = await updateProfile({
      birthday: formattedDate
    });
    
    if (result.success) {
      onSuccess && onSuccess(result.message);
      onClose();
    } else {
      onError && onError(result.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.selectsContainer}>
        <DateSelect
          label="Month"
          value={month}
          options={monthOptions}
          onSelect={handleMonthChange}
        />
        <DateSelect
          label="Day"
          value={adjustedDay}
          options={dayOptions}
          onSelect={setDay}
        />
        <DateSelect
          label="Year"
          value={year}
          options={yearOptions}
          onSelect={handleYearChange}
        />
      </View>

      <TouchableOpacity 
        style={[
          styles.saveButton,
          (!isValid || isLoading) && styles.saveButtonDisabled
        ]} 
        onPress={handleSave}
        disabled={!isValid || isLoading}
      >
        <Check color="white" size={20} />
        <Text style={styles.saveButtonText}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  selectsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
    justifyContent: 'center'
  },
  selectContainer: {
    alignSelf: 'flex-start',
  },
  selectLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

