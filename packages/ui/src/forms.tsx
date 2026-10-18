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
  /** Without it the boxes only show a value (as in the gallery). */
  onChangeText?: (code: string) => void;
  autoFocus?: boolean;
  invalid?: boolean;
}

/**
 * The boxes of a login code (S3). One invisible input lies over the boxes, so typing, pasting
 * and the phone's "code from Mail/Messages" suggestion all work; screen readers hear one field.
 */
export function CodeInput({ value = '', length = 6, label = 'Code van zes cijfers', onChangeText, autoFocus, invalid }: CodeInputProps) {
  const focus = useFocusRing();
  const boxes = (
    <View style={styles.code} aria-hidden={onChangeText ? true : undefined}>
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          accessible={!onChangeText}
          aria-label={onChangeText ? undefined : `Cijfer ${i + 1}${value.charAt(i) ? `: ${value.charAt(i)}` : ''}`}
          style={[styles.codeBox, i === value.length && styles.codeNext, invalid && styles.codeInvalid]}
        >
          <Text style={styles.codeDigit}>{value.charAt(i)}</Text>
        </View>
      ))}
    </View>
  );
  if (!onChangeText) {
    return (
      <View role="group" aria-label={label}>
        {boxes}
      </View>
    );
  }
  return (
    <View style={focus.ring}>
      {boxes}
      <TextInput
        accessibilityLabel={label}
        aria-invalid={invalid || undefined}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, length))}
        autoFocus={autoFocus}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        caretHidden
        style={styles.codeCapture}
      />
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
  codeInvalid: { borderColor: color.plum },
  // Covers the boxes so a tap anywhere focuses it; nearly transparent but still tappable.
  codeCapture: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.02, color: 'transparent', fontSize: 1 },
  codeDigit: { fontFamily: fontFamily('sticker', 400), fontSize: 26, color: color.ink, includeFontPadding: false },
});
