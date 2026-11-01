// Корень: экраны переключаются состоянием, без роутера — их пять (спецификация, «Решения агента»).
import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { FONT_FILES } from './src/ui/fonts';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from './src/state/game';
import { TitleScreen } from './src/screens/TitleScreen';
import { IntroScreen } from './src/screens/IntroScreen';
import { PrepScreen } from './src/screens/PrepScreen';
import { DaysScreen } from './src/screens/DaysScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { AboutScreen } from './src/screens/AboutScreen';
import { C } from './src/ui/theme';

export default function App() {
  const game = useGame();
  // шрифты студии лежат в сборке — грузятся мгновенно; не загрузились — игра идёт системным шрифтом
  const [fontsReady, fontsError] = useFonts(FONT_FILES);
  const { screen, setScreen } = game;
  // «Назад» на телефоне — на первый экран; начатая партия сохранена, там — «Продолжить».
  // С первого экрана — выход из приложения.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'title') return false;
      setScreen('title');
      return true;
    });
    return () => sub.remove();
  }, [screen, setScreen]);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.root}>
          {fontsReady || fontsError ? (
            <>
              {screen === 'title' ? <TitleScreen game={game} /> : null}
              {screen === 'intro' ? <IntroScreen game={game} /> : null}
              {screen === 'prep' ? <PrepScreen game={game} /> : null}
              {screen === 'days' ? <DaysScreen game={game} /> : null}
              {screen === 'result' ? <ResultScreen game={game} /> : null}
              {screen === 'about' ? <AboutScreen game={game} /> : null}
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: C.linen } });
