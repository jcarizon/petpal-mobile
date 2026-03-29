import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarClock } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface DateTimeFieldProps {
  label: string;
  value: Date | null;
  onChange: (value: Date) => void;
  mode?: 'date' | 'datetime';
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

const formatDisplayValue = (value: Date | null, mode: 'date' | 'datetime') => {
  if (!value) return 'Select date';

  if (mode === 'datetime') {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(value);
};

export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'date',
  error,
  minimumDate,
  maximumDate,
}: DateTimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isSelectingTime, setIsSelectingTime] = useState(false);

  const pickerMode: 'date' | 'time' = mode === 'datetime' && isSelectingTime ? 'time' : 'date';
  const displayValue = useMemo(() => formatDisplayValue(value, mode), [mode, value]);

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      setIsSelectingTime(false);
      return;
    }

    if (!selectedDate) return;

    if (mode === 'datetime' && pickerMode === 'date') {
      const base = value ?? new Date();
      const merged = new Date(selectedDate);
      merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
      onChange(merged);
      setIsSelectingTime(true);
      return;
    }

    if (mode === 'datetime' && pickerMode === 'time') {
      const base = value ?? new Date();
      const merged = new Date(base);
      merged.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      onChange(merged);
    } else {
      onChange(selectedDate);
    }

    setShowPicker(false);
    setIsSelectingTime(false);
  };

  const handleIOSChange = (_: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.field, !!error && styles.fieldError]}
        onPress={() => {
          setIsSelectingTime(false);
          setShowPicker(true);
        }}
      >
        <Text style={[styles.valueText, !value && styles.placeholder]}>{displayValue}</Text>
        <CalendarClock size={18} color={Colors.textSecondary} />
      </Pressable>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={value ?? new Date()}
          mode={pickerMode}
          display="default"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          is24Hour
        />
      )}

      {showPicker && Platform.OS === 'ios' && (
        <View style={styles.iosPickerWrap}>
          <DateTimePicker
            value={value ?? new Date()}
            mode={mode === 'datetime' ? 'datetime' : 'date'}
            display="compact"
            onChange={handleIOSChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
          <Pressable style={styles.doneBtn} onPress={() => setShowPicker(false)}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  field: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldError: {
    borderColor: Colors.error,
  },
  valueText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  placeholder: {
    color: Colors.textDisabled,
    fontWeight: '400',
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
  },
  iosPickerWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 8,
    gap: 8,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  doneText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
