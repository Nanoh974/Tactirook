import { useEffect, useRef, useState, type ComponentRef } from 'react'
import { Alert, BackHandler, Linking, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import type { Square } from 'chess.js'
import Svg, { Path } from 'react-native-svg'
import { Board } from './src/Board'
import { categories, categoryGroups } from './src/puzzles'
import { libraryTotal, puzzleCounts } from './src/puzzleLibrary'
import { useChessTrainer } from './src/useChessTrainer'
import { styles } from './src/styles'

function TrainingApp() {
  const trainer = useChessTrainer()
  const [selected, setSelected] = useState<Square | null>(null)
  const [trainingOpen, setTrainingOpen] = useState(false)
  const [themeSearch, setThemeSearch] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Checkmates'])
  const [hidePuzzleType, setHidePuzzleType] = useState(false)
  const [hidePuzzleRating, setHidePuzzleRating] = useState(false)
  const [autoNextPuzzle, setAutoNextPuzzle] = useState(false)
  const [mobileContentSize, setMobileContentSize] = useState<{ width: number; height: number } | null>(null)
  const trainingButton = useRef<ComponentRef<typeof Pressable>>(null)
  const firstSetting = useRef<ComponentRef<typeof Pressable>>(null)
  const restoreTrainingFocus = useRef(false)
  const nextPuzzleRef = useRef(trainer.nextPuzzle)
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const compact = width <= 740
  const challengeName = trainer.loading
    ? 'Loading puzzle...'
    : trainer.error
      ? 'Puzzle unavailable'
      : !trainer.hasFocus
    ? 'No focus selected'
    : hidePuzzleType
      ? 'Puzzle type hidden'
      : categories.filter((category) => trainer.puzzle.themes.includes(category.id)).map(({ label }) => label).join(' · ')
  const mobileBoardSize = Math.min(mobileContentSize?.width ?? (width - insets.left - insets.right), Math.max(0, (mobileContentSize?.height ?? (height - insets.top - 56)) - insets.bottom - 148))
  useEffect(() => {
    nextPuzzleRef.current = trainer.nextPuzzle
  }, [trainer.nextPuzzle])
  useEffect(() => {
    if (!autoNextPuzzle || !trainer.enabled || trainer.status !== 'success') return
    const timer = setTimeout(() => {
      setSelected(null)
      nextPuzzleRef.current()
    }, 500)
    return () => clearTimeout(timer)
  }, [autoNextPuzzle, trainer.enabled, trainer.status, trainer.puzzle.id])
  useEffect(() => {
    if (!trainingOpen) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setTrainingOpen(false)
      return true
    })
    return () => subscription.remove()
  }, [trainingOpen])
  useEffect(() => {
    if (Platform.OS !== 'web') return
    if (!trainingOpen) {
      if (restoreTrainingFocus.current) {
        trainingButton.current?.focus()
        restoreTrainingFocus.current = false
      }
      return
    }
    firstSetting.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        restoreTrainingFocus.current = true
        setTrainingOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [trainingOpen])
  const progress = trainer.movesPlayed + (trainer.status === 'success' ? 1 : 0)
  const feedback = trainer.loading
    ? ['Loading puzzle...', 'Reading the local puzzle library.']
    : trainer.error
      ? ['Unable to load puzzle', trainer.error]
      : !trainer.hasFocus
    ? ['Ready when you are', 'Pick at least one puzzle type.']
    : trainer.status === 'success'
      ? ['Puzzle solved!', 'Nicely done. Keep the momentum going.']
      : trainer.status === 'wrong'
        ? ['Wrong move', 'The position has been reset. Give it another go.']
        : trainer.status === 'replying'
          ? ['Opponent is moving...', 'Watch the response, then find your next move.']
          : ['Your move', 'Drag a piece or tap it, then tap a destination.']

  function next() {
    setSelected(null)
    trainer.nextPuzzle()
  }

  function reset() {
    setSelected(null)
    trainer.restart()
  }

  function closeTraining() {
    restoreTrainingFocus.current = true
    setTrainingOpen(false)
  }

  function openLink(url: string) {
    Linking.openURL(url).catch((error: unknown) => {
      console.error('Unable to open link', error)
      Alert.alert('Unable to open link', 'Please try again.')
    })
  }

  const training = (
    <View style={styles.trainingContent}>
      <Text style={styles.kicker}>YOUR TRAINING  ──</Text>
      <View style={styles.trainingHeader}>
        <Text style={styles.trainingTitle}>Training settings<Text style={styles.accent}>.</Text></Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close training settings" onPress={closeTraining} style={styles.closeTraining}>
          <Text style={styles.closeTrainingText}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.settingsHeading}>PUZZLE INFORMATION</Text>
      <Text style={styles.settingsDescription}>Hide details to solve without knowing what to look for.</Text>
      {([
        { label: 'Hide puzzle type', description: 'Do not reveal the current challenge type.', checked: hidePuzzleType, toggle: setHidePuzzleType },
        { label: 'Hide puzzle rating', description: 'Do not reveal the current puzzle rating.', checked: hidePuzzleRating, toggle: setHidePuzzleRating },
      ] as const).map((setting) => (
        <Pressable
          key={setting.label}
          ref={setting.label === 'Hide puzzle type' ? firstSetting : undefined}
          accessibilityRole="checkbox"
          accessibilityLabel={setting.label}
          accessibilityState={{ checked: setting.checked }}
          onPress={() => setting.toggle((checked) => !checked)}
          style={[styles.settingOption, setting.checked && styles.categoryActive]}
        >
          <View style={styles.categoryText}>
            <Text style={styles.categoryLabel}>{setting.label}</Text>
            <Text style={styles.categorySubtitle}>{setting.description}</Text>
          </View>
          <View style={[styles.checkbox, setting.checked && styles.checkboxActive]}><Text style={styles.checkmark}>{setting.checked ? '✓' : ''}</Text></View>
        </Pressable>
      ))}
      <View style={styles.divider} />
      <Text style={styles.settingsHeading}>PUZZLE FLOW</Text>
      <Text style={styles.settingsDescription}>Choose what happens after solving a puzzle.</Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel="Automatically advance to next puzzle"
        accessibilityState={{ checked: autoNextPuzzle }}
        onPress={() => setAutoNextPuzzle((enabled) => !enabled)}
        style={[styles.settingOption, autoNextPuzzle && styles.categoryActive]}
      >
        <View style={styles.categoryText}>
          <Text style={styles.categoryLabel}>Automatically advance</Text>
          <Text style={styles.categorySubtitle}>Next puzzle 0.5 seconds after solving.</Text>
        </View>
        <View style={[styles.checkbox, autoNextPuzzle && styles.checkboxActive]}><Text style={styles.checkmark}>{autoNextPuzzle ? '✓' : ''}</Text></View>
      </Pressable>
      <View style={styles.divider} />
      <Text style={styles.settingsHeading}>CHOOSE YOUR FOCUS</Text>
      <Text style={styles.trainingDescription}>Match any selected theme. {libraryTotal.toLocaleString('en')} unique puzzles.</Text>
      <TextInput
        accessibilityLabel="Search puzzle themes"
        placeholder="Search themes..."
        value={themeSearch}
        onChangeText={(value) => {
          setThemeSearch(value)
          const query = value.trim().toLowerCase()
          if (query) {
            const matches = categoryGroups.filter((group) => group.themes.some(({ label }) => label.toLowerCase().includes(query)))
            setExpandedGroups((expanded) => [...new Set([...expanded, ...matches.map(({ label }) => label)])])
          }
        }}
        style={styles.themeSearch}
      />
      <View style={styles.themeToolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Select all puzzle themes" onPress={() => { setSelected(null); trainer.selectCategories(categories.filter(({ id }) => puzzleCounts[id] > 0).map(({ id }) => id)) }} style={styles.themeBulk}>
          <Text style={styles.themeBulkText}>All / mixed</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Clear puzzle themes" onPress={() => { setSelected(null); trainer.selectCategories([]) }} style={styles.themeBulk}>
          <Text style={styles.themeBulkText}>Clear</Text>
        </Pressable>
        <Text style={styles.themeSelection}>{trainer.selectedCategories.length} selected</Text>
      </View>
      {categoryGroups.map((group) => {
        const themes = group.themes.filter(({ label }) => label.toLowerCase().includes(themeSearch.trim().toLowerCase()))
        if (!themes.length) return null
        const expanded = expandedGroups.includes(group.label)
        return (
          <View key={group.label}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={group.label}
              accessibilityState={{ expanded }}
              onPress={() => setExpandedGroups((groups) => expanded ? groups.filter((label) => label !== group.label) : [...groups, group.label])}
              style={styles.themeGroupHeader}
            >
              <Text style={styles.themeGroupTitle}>{group.label}</Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" aria-hidden>
                <Path d={expanded ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} fill="none" stroke="#83877d" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            {expanded && <View style={styles.categories}>
              {themes.map((category) => {
                const checked = trainer.selectedCategories.includes(category.id)
                const count = puzzleCounts[category.id]
                return (
                  <Pressable
                    key={category.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={category.label}
                    accessibilityHint={`${count.toLocaleString('en')} puzzles available`}
                    accessibilityState={{ checked, disabled: count === 0 }}
                    disabled={count === 0}
                    onPress={() => { setSelected(null); trainer.toggleCategory(category.id) }}
                    style={[styles.category, checked && styles.categoryActive, count === 0 && styles.disabled]}
                  >
                    <View style={[styles.themeCheckbox, checked && styles.checkboxActive]}><Text style={styles.checkmark}>{checked ? '✓' : ''}</Text></View>
                    <Text style={styles.themeLabel}>{category.label}</Text>
                    <Text style={styles.themeCount}>{count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}</Text>
                  </Pressable>
                )
              })}
            </View>}
          </View>
        )
      })}
      {!categories.some(({ label }) => label.toLowerCase().includes(themeSearch.trim().toLowerCase())) && <Text style={styles.settingsDescription}>No matching themes.</Text>}
      <Text style={styles.selectionNote}>✓  {trainer.selectedCategories.length} of {categories.length} selected</Text>
      {compact && (
        <Text style={styles.mobileCredits}>Puzzles from <Text accessibilityRole="link" style={styles.link} onPress={() => openLink('https://lichess.org')}>Lichess</Text> · <Text accessibilityRole="link" style={styles.link} onPress={() => openLink('https://github.com/lichess-org/lila/tree/master/public/piece/staunty')}>Staunty pieces by sadsnake1</Text></Text>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.app} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={[styles.header, compact && styles.headerCompact]}>
        <View style={styles.brand}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>♞</Text></View>
          {!compact && <Text style={styles.brandText}>chess<Text style={styles.brandLight}>trainer</Text><Text style={styles.accent}>.</Text></Text>}
        </View>
        {compact && (
          <View style={styles.mobileHeaderInfo}>
            <Text style={styles.mobilePuzzleId} numberOfLines={1}>Puzzle #{trainer.puzzle.id}</Text>
            <View style={styles.mobileMetadata}>
              <Text style={styles.mobilePuzzleDetails} numberOfLines={1}>{challengeName}</Text>
              {trainer.enabled && !hidePuzzleRating && <Text style={styles.mobilePuzzleRating} numberOfLines={1}>{trainer.puzzle.rating} rated</Text>}
            </View>
          </View>
        )}
        <Pressable
          ref={trainingButton}
          accessibilityRole="button"
          accessibilityLabel="Your training"
          accessibilityState={{ expanded: trainingOpen }}
          onPress={() => setTrainingOpen((open) => !open)}
          style={styles.trainingToggle}
        >
          <View style={styles.menuIcon}>
            <View style={styles.menuIconLine} />
            <View style={styles.menuIconLine} />
            <View style={styles.menuIconLine} />
          </View>
        </Pressable>
      </View>

      {compact ? (
        <View
          testID="mobile-content"
          aria-hidden={trainingOpen}
          accessibilityElementsHidden={trainingOpen}
          importantForAccessibility={trainingOpen ? 'no-hide-descendants' : 'auto'}
          onLayout={(event) => {
            const { width: contentWidth, height: contentHeight } = event.nativeEvent.layout
            setMobileContentSize({ width: contentWidth, height: contentHeight })
          }}
          style={[styles.mobileContent, { paddingBottom: insets.bottom }]}
        >
          <View testID="mobile-board" style={[styles.mobileBoard, { width: mobileBoardSize }]}>
            <Board trainer={trainer} selected={selected} setSelected={setSelected} edgeToEdge />
          </View>
          <View accessibilityLiveRegion="polite" style={styles.mobileFeedback}>
            <View style={[styles.mobileFeedbackIcon, trainer.status === 'wrong' && styles.feedbackWrong, trainer.status === 'success' && styles.feedbackSuccess]}>
              <Text style={styles.feedbackIconText}>{trainer.status === 'success' ? '✓' : trainer.status === 'wrong' ? '↻' : '♔'}</Text>
            </View>
            <View style={styles.mobileFeedbackText}>
              <Text style={styles.mobileFeedbackTitle}>{feedback[0]}</Text>
              <Text style={styles.mobileFeedbackDescription}>{trainer.enabled ? `You play ${trainer.side === 'w' ? 'white' : 'black'}. ${feedback[1]}` : feedback[1]}</Text>
              {trainer.error && <Pressable accessibilityRole="button" accessibilityLabel="Retry loading puzzle" onPress={trainer.retry} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></Pressable>}
            </View>
          </View>
          <View style={styles.mobileActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Restart this puzzle" disabled={!trainer.enabled} onPress={reset} style={[styles.mobileAction, !trainer.enabled && styles.disabled]}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#355a45" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <Path d="M3 3v5h5" />
              </Svg>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next puzzle" disabled={!trainer.enabled} onPress={next} style={[styles.mobileAction, !trainer.enabled && styles.disabled]}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#355a45" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 12h16M14 6l6 6-6 6" />
              </Svg>
            </Pressable>
          </View>
        </View>
      ) : (
      <ScrollView
        aria-hidden={trainingOpen}
        accessibilityElementsHidden={trainingOpen}
        importantForAccessibility={trainingOpen ? 'no-hide-descendants' : 'auto'}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
      >
        <View style={styles.main}>
          <View style={styles.boardPanel}>
            <View testID="puzzle-frame" style={styles.boardFrame}>
              <View style={styles.challengeBanner}>
                <View style={styles.challengeDetails}>
                  <View style={styles.challengeIcon}><Text style={styles.challengeIconText}>◎</Text></View>
                  <View style={styles.challengeText}>
                    <Text style={styles.currentLabel}>CURRENT CHALLENGE</Text>
                    <Text style={styles.challengeName} numberOfLines={2}>
                      {challengeName}
                    </Text>
                  </View>
                  {trainer.enabled && !hidePuzzleRating && <Text style={styles.rating}>★  {trainer.puzzle.rating} rated</Text>}
                </View>
                <View style={styles.challengeActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Next puzzle" disabled={!trainer.enabled} onPress={next} style={[styles.nextButton, !trainer.enabled && styles.disabled]}>
                    <Text style={styles.nextButtonText}>Next puzzle  →</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Restart this puzzle" disabled={!trainer.enabled} onPress={reset} style={[styles.resetButton, !trainer.enabled && styles.disabled]}>
                    <Text style={styles.resetText}>↻  Restart</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.boardLine}>
                <Text style={styles.boardIcon}>♚</Text>
                <Text style={styles.boardLineText}>CHESS PUZZLE</Text>
                <Text style={styles.lineEnd}>#{trainer.puzzle.id}</Text>
              </View>
              <Board trainer={trainer} selected={selected} setSelected={setSelected} />
              <View style={styles.boardLine}>
                <Text style={styles.boardIcon}>♔</Text>
                <Text style={styles.boardLineText}>YOU PLAY {trainer.side === 'w' ? 'WHITE' : 'BLACK'}</Text>
                {!hidePuzzleType && <Text style={styles.lineEnd}>{Math.min(progress, trainer.playerMoves)} / {trainer.playerMoves} moves</Text>}
              </View>
            </View>
            <View accessibilityLiveRegion="polite" style={[styles.feedback, trainer.status === 'wrong' && styles.feedbackWrong, trainer.status === 'success' && styles.feedbackSuccess]}>
              <View style={styles.feedbackIcon}><Text style={styles.feedbackIconText}>{trainer.status === 'success' ? '✓' : trainer.status === 'wrong' ? '↻' : '◎'}</Text></View>
              <View style={styles.feedbackText}>
                <Text style={styles.feedbackTitle}>{feedback[0]}</Text>
                <Text style={styles.feedbackDescription}>{feedback[1]}</Text>
                {trainer.error && <Pressable accessibilityRole="button" accessibilityLabel="Retry loading puzzle" onPress={trainer.retry} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></Pressable>}
              </View>
              {trainer.status === 'success' && trainer.enabled && (
                <Pressable accessibilityRole="button" accessibilityLabel="Next puzzle" onPress={next} style={styles.feedbackNext}><Text style={styles.nextButtonText}>→</Text></Pressable>
              )}
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>CHESSTRAINER</Text>
          <Text style={styles.footerText}>Puzzles from <Text accessibilityRole="link" style={styles.link} onPress={() => openLink('https://lichess.org')}>Lichess</Text> · <Text accessibilityRole="link" style={styles.link} onPress={() => openLink('https://github.com/lichess-org/lila/tree/master/public/piece/staunty')}>Staunty pieces by sadsnake1</Text></Text>
        </View>
      </ScrollView>
      )}

      {trainingOpen && (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Close training menu" onPress={closeTraining} style={[styles.menuBackdrop, compact && styles.menuBackdropCompact]} />
          <View accessibilityViewIsModal onAccessibilityEscape={closeTraining} style={[styles.trainingMenu, compact && styles.trainingMenuCompact, { maxHeight: Math.max(100, height - insets.top - insets.bottom - (compact ? 71 : 82)) }]}>
            <ScrollView>{training}</ScrollView>
          </View>
        </>
      )}
    </SafeAreaView>
  )
}

export default function App() {
  const [loaded, error] = useFonts({
    DMSans: require('./assets/fonts/DMSans.ttf'),
    DMSerif: require('./assets/fonts/DMSerifDisplay-Regular.ttf'),
  })

  if (error) {
    return <View style={styles.loading}><Text>Unable to load the app fonts: {error.message}</Text></View>
  }
  if (!loaded) return <View style={styles.loading}><Text>Loading ChessTrainer...</Text></View>

  return <SafeAreaProvider><TrainingApp /></SafeAreaProvider>
}
