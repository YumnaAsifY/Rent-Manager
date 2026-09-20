import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type LiftPressableProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
  lift?: boolean;
};

export default function LiftPressable({
  style,
  lift = true,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: LiftPressableProps) {
  const [lifted, setLifted] = useState(false);
  const showLift = lift && lifted && !disabled;

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled && lift) {
          setLifted(true);
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setLifted(false);
        onPressOut?.(event);
      }}
      onHoverIn={() => {
        if (!disabled && lift) {
          setLifted(true);
        }
      }}
      onHoverOut={() => setLifted(false)}
      style={[style, showLift && styles.lift]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lift: {
    transform: [{ translateY: -3 }],
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 2,
  },
});
