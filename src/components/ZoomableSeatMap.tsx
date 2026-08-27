import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const MAX_ZOOM_MULTIPLIER = 4;
const MIN_ZOOM_MULTIPLIER = 0.5;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/**
 * Hiển thị sơ đồ ghế thu nhỏ vừa khung nhìn (bao quát toàn bộ phòng) ban đầu,
 * cho phép chụm để phóng to/thu nhỏ và kéo để xem chi tiết từng ghế.
 */
export default function ZoomableSeatMap({
  children,
  height = 340,
}: {
  children: React.ReactNode;
  height?: number;
}) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  const fitScale = useSharedValue(1);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const applyFit = useCallback(
    (cw: number, ch: number, contW: number, contH: number) => {
      if (!cw || !ch || !contW || !contH) return;
      const fit = Math.min(cw / contW, ch / contH, 1);
      fitScale.value = fit;
      scale.value = fit;
      savedScale.value = fit;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    },
    [fitScale, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]
  );

  const onContainerLayout = (e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    setContainerSize({ width, height: h });
    applyFit(width, h, contentSize.width, contentSize.height);
  };

  const onContentLayout = (e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    if (Math.round(contentSize.width) === Math.round(width) && Math.round(contentSize.height) === Math.round(h)) return;
    setContentSize({ width, height: h });
    applyFit(containerSize.width, containerSize.height, width, h);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(
        savedScale.value * e.scale,
        fitScale.value * MIN_ZOOM_MULTIPLIER,
        fitScale.value * MAX_ZOOM_MULTIPLIER
      );
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value <= fitScale.value + 0.001) return;
      const maxTranslateX = Math.max((contentSize.width * scale.value - containerSize.width) / 2, 0);
      const maxTranslateY = Math.max((contentSize.height * scale.value - containerSize.height) / 2, 0);
      translateX.value = clamp(savedTranslateX.value + e.translationX, -maxTranslateX, maxTranslateX);
      translateY.value = clamp(savedTranslateY.value + e.translationY, -maxTranslateY, maxTranslateY);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const zoomedIn = scale.value > fitScale.value + 0.001;
      scale.value = zoomedIn ? fitScale.value : fitScale.value * 2;
      savedScale.value = scale.value;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureHandlerRootView style={styles.rootWrap}>
      <View style={[styles.container, { height }]} onLayout={onContainerLayout}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.content, animatedStyle]}>
            <View onLayout={onContentLayout}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootWrap: { width: '100%' },
  container: { width: '100%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', justifyContent: 'center' },
});
