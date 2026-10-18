import { useId } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { webAria } from './a11y';
import { useFocusRing } from './focus';
import { fontFamily, text } from './text';
import { border, color, radius, shadow, size } from './tokens';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, onFocus, onBlur, ...input }: TextFieldProps) {
  const focus = useFocusRing();
  const noteId = useId();
  const note = error ?? hint;
  return (
    <View style={styles.field}>
      {/* The input carries the label itself, so screen readers don't hear it twice. */}
      <Text aria-hidden style={text('fieldLabel')}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={note}
        aria-invalid={error ? true : undefined}
        placeholderTextColor={color.inkMuted}
        {...webAria({ 'aria-describedby': note ? noteId : undefined })}
        {...input}
        onFocus={(e) => {
          focus.onFocus(e);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          focus.onBlur();
          onBlur?.(e);
        }}
        style={[styles.input, error ? styles.inputError : null, focus.ring]}
      />
      {note ? (
        <Text
          nativeID={noteId}
          role={error ? 'alert' : undefined}
          accessibilityLiveRegion={error ? 'polite' : undefined}
          style={[styles.hint, error ? styles.hintError : null]}
        >
          {note}
        </Text>
      ) : null}
    </View>
  );
}

export interface CodeInputProps {
  value?: string;
  length?: number;
  label?: string;
}

/** The boxes of a login code. The actual input comes with S3 in step 2. */
export function CodeInput({ value = '', length = 6, label = 'Code van zes cijfers' }: CodeInputProps) {
  return (
    <View role="group" aria-label={label} style={styles.code}>
      {Array.from({ length }, (_, i) => (
        <View key={i} accessible aria-label={`Cijfer ${i + 1}${value.charAt(i) ? `: ${value.charAt(i)}` : ''}`} style={[styles.codeBox, i === value.length && styles.codeNext]}>
          <Text style={styles.codeDigit}>{value.charAt(i)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  input: {
    height: size.field,
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderRadius: radius.radiusM,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.white,
    fontFamily: fontFamily('sans', 400),
    fontSize: 16,
    color: color.ink,
  },
  inputError: { borderColor: color.plum, borderWidth: border.edge + 1 },
  hint: { ...text('meta'), color: color.inkMuted },
  hintError: { color: color.plum },
  code: { flexDirection: 'row', gap: 8 },
  codeBox: {
    width: 46,
    height: 58,
    borderRadius: radius.radiusM,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeNext: { backgroundColor: color.sunshine, boxShadow: shadow.shadowSm },
  codeDigit: { fontFamily: fontFamily('sticker', 400), fontSize: 26, color: color.ink, includeFontPadding: false },
});
