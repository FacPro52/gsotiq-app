/**
 * AppHeader — unified branded header for every screen in GSOTiQ.
 *
 * Mobile : title + icon on left | logo on right | 2px gold border
 * Web    : title + icon on left | logo CENTERED (absolute) | 2px gold border
 *
 * Props
 *  icon      – MaterialCommunityIcons name for the current screen
 *  title     – screen title string
 *  color     – icon + title color (default navy)
 *  backIcon  – parent-screen icon shown inside the back chevron area
 *  backColor – color for back chevron + icon (defaults to `color`)
 *  onBack    – called when the back area is pressed
 *  canGoBack – when true, renders the back button
 *  greeting  – { greet, firstName } — used on Dashboard instead of icon/title
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const LOGO = require('../../assets/gsotiq-logo.png');
const GOLD  = '#F39C12';
const NAVY  = '#0F2548';

export function AppHeader({
  icon,
  title,
  color     = NAVY,
  backIcon,
  backColor,
  onBack,
  canGoBack = false,
  greeting,           // { greet: string, firstName: string }
}) {
  const insets   = useSafeAreaInsets();
  const chevron  = backColor || color;

  /* ── left content ───────────────────────────────────────────────────────── */
  const LeftContent = () => {
    if (greeting) {
      return (
        <View style={{ flexDirection: 'column', justifyContent: 'center', marginLeft: 16 }}>
          <Text style={{ fontSize: 11, color: '#888', fontWeight: '500' }}>
            {greeting.greet},
          </Text>
          <Text style={{ fontSize: 18, color: NAVY, fontWeight: '800', lineHeight: 22 }}>
            {greeting.firstName} 👋
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Back button */}
        {canGoBack && onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 6 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={30} color={chevron} />
            {backIcon ? (
              <MaterialCommunityIcons name={backIcon} size={19} color={chevron} />
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 16 }} />
        )}

        {/* Screen icon + title */}
        {icon ? (
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        ) : null}
        {title ? (
          <Text
            style={{
              color,
              fontWeight: '800',
              fontSize: 18,
              letterSpacing: 0.2,
              marginLeft: icon ? 7 : 0,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
      </View>
    );
  };

  /* ── WEB layout ─────────────────────────────────────────────────────────── */
  if (Platform.OS === 'web') {
    return (
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 2, borderBottomColor: GOLD }}>
        <View
          style={{
            height: 64,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}
        >
          {/* Left — flex 1 so it pushes the spacer to the right */}
          <View style={{ flex: 1 }}>
            <LeftContent />
          </View>

          {/* Logo — absolutely centered, pointer-events off so left content stays tappable */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image source={LOGO} style={{ width: 160, height: 50 }} resizeMode="contain" />
          </View>

          {/* Right spacer — same flex as left so the logo stays centered */}
          <View style={{ flex: 1 }} />
        </View>
      </View>
    );
  }

  /* ── MOBILE layout ──────────────────────────────────────────────────────── */
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 2,
        borderBottomColor: GOLD,
        paddingTop: insets.top,
      }}
    >
      <View
        style={{
          height: 56,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <LeftContent />
        </View>

        {/* Right: logo */}
        <Image
          source={LOGO}
          style={{ width: 110, height: 34, marginRight: 16, flexShrink: 0 }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
