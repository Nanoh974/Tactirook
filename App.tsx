import { useEffect, useRef, useState, type ComponentRef } from 'react'
import { AccessibilityInfo, BackHandler, findNodeHandle, Image, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import type { Square } from 'chess.js'
import Svg, { Path, SvgXml } from 'react-native-svg'
import { Board } from './src/Board'
import { categories, categoryGroups } from './src/puzzles'
import { libraryTotal, puzzleCounts } from './src/puzzleLibrary'
import { useChessTrainer } from './src/useChessTrainer'
import { styles as lightStyles, darkStyles, mobileActionBarHeight, mobileFeedbackMinHeight } from './src/styles'
import { LocalizationProvider, useLocalization } from './src/i18n/LocalizationProvider'
import { languages, normalizeSearch } from './src/i18n/translations'
import { groupLabel, themeLabel } from './src/i18n/themes'
import { ThemeProvider, useTheme } from './src/ThemeProvider'
import { boardPaletteNames, boardPalettes } from './src/boardPalettes'
import { pieceLicenseTexts, pieceXml } from './src/pieceXml'
import { useWebDialog } from './src/useWebDialog'
import { useWebFocusStyles } from './src/useWebFocusStyles'
import { notify } from './src/notify'
import { CreditLink } from './src/CreditLink'
import { useTrainingSettings } from './src/useTrainingSettings'
import { pieceSetNames, pieceSets } from './src/pieceSets'

function TrainingApp() {
  useWebFocusStyles()
  const { language, setLanguage, t, number } = useLocalization()
  const { theme, setTheme, boardPalette, setBoardPalette, boardPosition, setBoardPosition, allowSeen, setAllowSeen, seenOptionReady, pieceSet, setPieceSet } = useTheme()
  const styles = theme === 'dark' ? darkStyles : lightStyles
  const iconColor = theme === 'dark' ? '#b2d8fa' : '#315a7d'
  const trainingSettings = useTrainingSettings((kind) => {
    notify(t(kind === 'load' ? 'trainingSettingsLoadError' : 'trainingSettingsSaveError'), t('tryAgain'))
  })
  const { hidePuzzleType, hidePuzzleRating, autoNextPuzzle } = trainingSettings.settings
  const trainer = useChessTrainer(allowSeen, (kind) => {
    notify(t(kind === 'load' ? 'seenLoadError' : 'seenSaveError'), t('tryAgain'))
  }, seenOptionReady && trainingSettings.ready, trainingSettings.settings.selectedCategories,
  (selectedCategories) => trainingSettings.update('selectedCategories', selectedCategories))
  const [selected, setSelected] = useState<Square | null>(null)
  const [trainingOpen, setTrainingOpen] = useState(false)
  const [pieceLicenseOpen, setPieceLicenseOpen] = useState(false)
  const [themeSearch, setThemeSearch] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Checkmates'])
  const [mobileContentSize, setMobileContentSize] = useState<{ width: number; height: number } | null>(null)
  const trainingButton = useRef<ComponentRef<typeof Pressable>>(null)
  const closeTrainingButton = useRef<ComponentRef<typeof Pressable>>(null)
  const wasTrainingOpen = useRef(false)
  const nextPuzzleRef = useRef(trainer.nextPuzzle)
  const { width, height, fontScale } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const compact = width <= 740
  const challengeName = trainer.loading
    ? t('loadingPuzzle')
    : trainer.error
      ? t('puzzleUnavailable')
      : !trainer.hasFocus
    ? t('noFocus')
    : hidePuzzleType
      ? t('typeHidden')
      : categories.filter((category) => trainer.puzzle.themes.includes(category.id)).map(({ id }) => themeLabel(id, language)).join(' · ')
  const mobileContentHeight = mobileContentSize?.height ?? (height - insets.top - 56)
  const scrollMobile = fontScale > 1.2 || mobileContentHeight < 340
  const availableMobileWidth = mobileContentSize?.width ?? (width - insets.left - insets.right)
  const mobileBoardSize = Math.min(availableMobileWidth, Math.max(scrollMobile ? 192 : 0, mobileContentHeight - insets.bottom - mobileActionBarHeight - mobileFeedbackMinHeight))
  const mobileBoardTopGap = Math.max(0, (mobileContentHeight - insets.bottom - mobileActionBarHeight - mobileBoardSize) / 2 - 64)
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
      closeTraining()
      return true
    })
    return () => subscription.remove()
  }, [trainingOpen])
  useWebDialog(trainingOpen, 'training-menu', 'close-training', true, closeTraining)
  useEffect(() => {
    if (Platform.OS === 'web') return
    const shouldRestore = wasTrainingOpen.current && !trainingOpen
    wasTrainingOpen.current = trainingOpen
    if (!trainingOpen && !shouldRestore) return
    const handle = findNodeHandle(trainingOpen ? closeTrainingButton.current : trainingButton.current)
    if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle)
  }, [trainingOpen])
  const progress = trainer.movesPlayed + (trainer.status === 'success' ? 1 : 0)
  const feedback = trainer.loading
    ? [t('loadingPuzzle'), t('readingLibrary')]
    : trainer.error
      ? [t('unableToLoad'), t('loadError')]
      : !trainer.hasFocus
    ? [t('ready'), t('pickTheme')]
    : trainer.status === 'success'
      ? [t('solved'), t('solvedDescription')]
      : trainer.status === 'wrong'
        ? [t('wrong'), t('wrongDescription')]
        : trainer.status === 'replying'
          ? [t('replying'), t('replyDescription')]
          : [t('yourMove'), `${t('moveDescription')}${Platform.OS === 'web' ? ` ${t('boardKeyboardHelp')}` : ''}`]
  const showFeedbackKing = trainer.enabled && trainer.status !== 'success' && trainer.status !== 'wrong'
  const previousStatus = useRef(trainer.status)
  const [feedbackHeading, feedbackDetail] = feedback
  useEffect(() => {
    if (Platform.OS === 'ios' && previousStatus.current !== trainer.status) {
      AccessibilityInfo.announceForAccessibility(`${feedbackHeading} ${feedbackDetail}`)
    }
    previousStatus.current = trainer.status
  }, [trainer.status, feedbackHeading, feedbackDetail])

  function next() {
    setSelected(null)
    trainer.nextPuzzle()
  }

  function reset() {
    setSelected(null)
    trainer.restart()
  }

  function closeTraining() {
    setTrainingOpen(false)
  }

  const credits = (
    <View style={[styles.credits, compact && styles.mobileCredits]}>
      <Text style={styles.footerText}>{t('puzzlesFrom')}</Text>
      <CreditLink url="https://lichess.org" label="Lichess" textStyle={[styles.footerText, styles.link]} />
      <CreditLink url="https://github.com/Solenia13/ChessTrainer" label={t('sourceAndLicenses')} textStyle={[styles.footerText, styles.link]} />
    </View>
  )

  const training = (
    <View style={styles.trainingContent}>
      <Text accessibilityRole="header" style={styles.settingsHeading}>{t('language')}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('language')} style={styles.languageOptions}>
        {languages.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: language === option.id }}
            aria-checked={language === option.id}
            tabIndex={Platform.OS === 'web' ? (language === option.id ? 0 : -1) : undefined}
            onPress={() => { setThemeSearch(''); setLanguage(option.id) }}
            style={[styles.languageOption, language === option.id && styles.categoryActive]}
          >
            <Text style={styles.languageOptionText}>{language === option.id ? '✓ ' : ''}{option.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.divider} />
      <Text accessibilityRole="header" style={styles.settingsHeading}>{t('appearance')}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('appearance')} style={styles.languageOptions}>
        {(['light', 'dark'] as const).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={t(option === 'light' ? 'lightTheme' : 'darkTheme')}
            accessibilityState={{ checked: theme === option }}
            aria-checked={theme === option}
            tabIndex={Platform.OS === 'web' ? (theme === option ? 0 : -1) : undefined}
            onPress={() => setTheme(option)}
            style={[styles.languageOption, theme === option && styles.categoryActive]}
          >
            <Text style={styles.languageOptionText}>{theme === option ? '✓ ' : ''}{t(option === 'light' ? 'lightTheme' : 'darkTheme')}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.divider} />
      <Text accessibilityRole="header" style={styles.settingsHeading}>{t('boardColor')}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('boardColor')} style={styles.languageOptions}>
        {boardPaletteNames.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={t(option === 'brown' ? 'boardBrown' : option === 'blue' ? 'boardBlue' : 'boardGreen')}
            accessibilityState={{ checked: boardPalette === option }}
            aria-checked={boardPalette === option}
            tabIndex={Platform.OS === 'web' ? (boardPalette === option ? 0 : -1) : undefined}
            onPress={() => setBoardPalette(option)}
            style={[styles.languageOption, styles.boardPaletteOption, boardPalette === option && styles.categoryActive]}
          >
            <View accessible={false} style={styles.boardPaletteSwatch}>
              <View style={[styles.boardPaletteSquare, { backgroundColor: boardPalettes[option].light }]} />
              <View style={[styles.boardPaletteSquare, { backgroundColor: boardPalettes[option].dark }]} />
            </View>
            <Text style={styles.languageOptionText}>{boardPalette === option ? '✓ ' : ''}{t(option === 'brown' ? 'boardBrown' : option === 'blue' ? 'boardBlue' : 'boardGreen')}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.divider} />
      <Text accessibilityRole="header" style={styles.settingsHeading}>{t('pieceStyle')}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('pieceStyle')} style={styles.languageOptions}>
        {pieceSetNames.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={pieceSets[option].name}
            accessibilityState={{ checked: pieceSet === option }}
            aria-checked={pieceSet === option}
            tabIndex={Platform.OS === 'web' ? (pieceSet === option ? 0 : -1) : undefined}
            onPress={() => setPieceSet(option)}
            style={[styles.languageOption, styles.boardPaletteOption, pieceSet === option && styles.categoryActive]}
          >
            <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <SvgXml xml={pieceXml[option].w.n} width={36} height={36} />
            </View>
            <Text style={styles.languageOptionText}>{pieceSet === option ? '✓ ' : ''}{pieceSets[option].name}</Text>
          </Pressable>
        ))}
      </View>
      <CreditLink
        url={pieceSets[pieceSet].url}
        label={`${pieceSets[pieceSet].name} — ${pieceSets[pieceSet].author} (${pieceSets[pieceSet].license})`}
        textStyle={[styles.footerText, styles.link]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: pieceLicenseOpen }}
        onPress={() => setPieceLicenseOpen((open) => !open)}
        style={styles.languageOption}
      >
        <Text style={styles.languageOptionText}>{t('pieceLicense')}</Text>
      </Pressable>
      {pieceLicenseOpen && <Text style={styles.footerText}>{pieceLicenseTexts[pieceSet]}</Text>}
      {compact && (
        <>
          <View style={styles.divider} />
          <Text accessibilityRole="header" style={styles.settingsHeading}>{t('boardPosition')}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('boardPosition')} style={styles.languageOptions}>
            {(['center', 'top'] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={t(option === 'center' ? 'boardPositionCenter' : 'boardPositionTop')}
                accessibilityState={{ checked: boardPosition === option }}
                aria-checked={boardPosition === option}
                tabIndex={Platform.OS === 'web' ? (boardPosition === option ? 0 : -1) : undefined}
                onPress={() => setBoardPosition(option)}
                style={[styles.languageOption, boardPosition === option && styles.categoryActive]}
              >
                <Text style={styles.languageOptionText}>{boardPosition === option ? '✓ ' : ''}{t(option === 'center' ? 'boardPositionCenter' : 'boardPositionTop')}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <View style={styles.divider} />
      <Text accessibilityRole="header" style={styles.settingsHeading}>{t('puzzleInformation')}</Text>
      <Text style={styles.settingsDescription}>{t('hideDetails')}</Text>
      {([
        { label: t('hideType'), description: t('hideTypeDescription'), checked: hidePuzzleType, key: 'hidePuzzleType' },
        { label: t('hideRating'), description: t('hideRatingDescription'), checked: hidePuzzleRating, key: 'hidePuzzleRating' },
      ] as const).map((setting) => (
        <Pressable
          key={setting.label}
          accessibilityRole="checkbox"
          accessibilityLabel={setting.label}
          aria-label={Platform.OS === 'web' ? `${setting.label}. ${setting.description}` : undefined}
          accessibilityState={{ checked: setting.checked }}
          aria-checked={setting.checked}
          accessibilityHint={setting.description}
          onPress={() => trainingSettings.update(setting.key, !setting.checked)}
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
      <Text accessibilityRole="header" style={styles.settingsHeading}>{t('puzzleFlow')}</Text>
      <Text style={styles.settingsDescription}>{t('flowDescription')}</Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={t('autoAdvanceLabel')}
        aria-label={Platform.OS === 'web' ? `${t('autoAdvanceLabel')}. ${t('autoAdvanceDescription')}` : undefined}
        accessibilityState={{ checked: autoNextPuzzle }}
        aria-checked={autoNextPuzzle}
        accessibilityHint={t('autoAdvanceDescription')}
        onPress={() => trainingSettings.update('autoNextPuzzle', !autoNextPuzzle)}
        style={[styles.settingOption, autoNextPuzzle && styles.categoryActive]}
      >
        <View style={styles.categoryText}>
          <Text style={styles.categoryLabel}>{t('autoAdvance')}</Text>
          <Text style={styles.categorySubtitle}>{t('autoAdvanceDescription')}</Text>
        </View>
        <View style={[styles.checkbox, autoNextPuzzle && styles.checkboxActive]}><Text style={styles.checkmark}>{autoNextPuzzle ? '✓' : ''}</Text></View>
      </Pressable>
      <View style={styles.divider} />
      <Text accessibilityRole="header" style={styles.settingsHeading}>{t('seenHeading')}</Text>
      <Text style={styles.settingsDescription}>{t('seenDescription')}</Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={t('allowSeen')}
        aria-label={Platform.OS === 'web' ? `${t('allowSeen')}. ${t('allowSeenDescription')}` : undefined}
        accessibilityState={{ checked: allowSeen }}
        aria-checked={allowSeen}
        accessibilityHint={t('allowSeenDescription')}
        onPress={() => setAllowSeen(!allowSeen)}
        style={[styles.settingOption, allowSeen && styles.categoryActive]}
      >
        <View style={styles.categoryText}>
          <Text style={styles.categoryLabel}>{t('allowSeen')}</Text>
          <Text style={styles.categorySubtitle}>{t('allowSeenDescription')}</Text>
        </View>
        <View style={[styles.checkbox, allowSeen && styles.checkboxActive]}><Text style={styles.checkmark}>{allowSeen ? '✓' : ''}</Text></View>
      </Pressable>
      <View style={styles.languageOptions}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('resetSeen')} disabled={!trainer.memoryLoaded || trainer.loading} onPress={trainer.resetSeenPuzzles} style={[styles.languageOption, (!trainer.memoryLoaded || trainer.loading) && styles.disabled]}>
          <Text style={styles.languageOptionText}>{t('resetSeen')}</Text>
        </Pressable>
      </View>
      <Text accessibilityLiveRegion="polite" aria-live="polite" style={styles.settingsDescription}>{t('seenCount', { count: number(trainer.seenCount) })}</Text>
      <View style={styles.divider} />
      <Text accessibilityRole="header" style={styles.settingsHeading}>{t('chooseFocus')}</Text>
      <Text style={styles.trainingDescription}>{t('focusDescription', { count: number(libraryTotal) })}</Text>
      <TextInput
        accessibilityLabel={t('searchThemes')}
        placeholder={t('searchPlaceholder')}
        placeholderTextColor={theme === 'dark' ? '#bbc9d9' : undefined}
        keyboardAppearance={theme}
        value={themeSearch}
        onChangeText={(value) => {
          setThemeSearch(value)
          const query = normalizeSearch(value)
          if (query) {
            const matches = categoryGroups.filter((group) => group.themes.some(({ id, label }) => normalizeSearch(themeLabel(id, language)).includes(query) || normalizeSearch(label).includes(query)))
            setExpandedGroups((expanded) => [...new Set([...expanded, ...matches.map(({ label }) => label)])])
          }
        }}
        style={styles.themeSearch}
      />
      <View style={styles.themeToolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('selectAll')} onPress={() => { setSelected(null); trainer.selectCategories(categories.filter(({ id }) => puzzleCounts[id] > 0).map(({ id }) => id)) }} style={styles.themeBulk}>
          <Text style={styles.themeBulkText}>{t('allMixed')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('clearThemes')} onPress={() => { setSelected(null); trainer.selectCategories([]) }} style={styles.themeBulk}>
          <Text style={styles.themeBulkText}>{t('clear')}</Text>
        </Pressable>
        <Text style={styles.themeSelection}>{t('selected', { count: number(trainer.selectedCategories.length) })}</Text>
      </View>
      {categoryGroups.map((group) => {
        const query = normalizeSearch(themeSearch)
        const themes = group.themes.filter(({ id, label }) => normalizeSearch(themeLabel(id, language)).includes(query) || normalizeSearch(label).includes(query))
        if (!themes.length) return null
        const expanded = expandedGroups.includes(group.label)
        return (
          <View key={group.label}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={groupLabel(group.label, language)}
              accessibilityState={{ expanded }}
              aria-expanded={expanded}
              onPress={() => setExpandedGroups((groups) => expanded ? groups.filter((label) => label !== group.label) : [...groups, group.label])}
              style={styles.themeGroupHeader}
            >
              <Text style={styles.themeGroupTitle}>{groupLabel(group.label, language)}</Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" aria-hidden>
                <Path d={expanded ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} fill="none" stroke={theme === 'dark' ? '#c8d6e5' : '#748393'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
                    accessibilityLabel={themeLabel(category.id, language)}
                    aria-label={Platform.OS === 'web' ? `${themeLabel(category.id, language)}. ${t('puzzlesAvailable', { count: number(count) })}` : undefined}
                    accessibilityHint={t('puzzlesAvailable', { count: number(count) })}
                    accessibilityState={{ checked, disabled: count === 0 }}
                    aria-checked={checked}
                    disabled={count === 0}
                    onPress={() => { setSelected(null); trainer.toggleCategory(category.id) }}
                    style={[styles.category, checked && styles.categoryActive, count === 0 && styles.disabled]}
                  >
                    <View style={[styles.themeCheckbox, checked && styles.checkboxActive]}><Text style={styles.checkmark}>{checked ? '✓' : ''}</Text></View>
                    <Text style={styles.themeLabel}>{themeLabel(category.id, language)}</Text>
                    <Text style={styles.themeCount}>{number(count, count >= 1000)}</Text>
                  </Pressable>
                )
              })}
            </View>}
          </View>
        )
      })}
      {!categories.some(({ id, label }) => normalizeSearch(themeLabel(id, language)).includes(normalizeSearch(themeSearch)) || normalizeSearch(label).includes(normalizeSearch(themeSearch))) && <Text style={styles.settingsDescription}>{t('noMatches')}</Text>}
      <Text style={styles.selectionNote}>✓  {t('selectedOf', { count: number(trainer.selectedCategories.length), total: number(categories.length) })}</Text>
      {compact && credits}
    </View>
  )

  return (
    <SafeAreaView style={styles.app} edges={['top', 'left', 'right']}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <View
        aria-hidden={trainingOpen}
        accessibilityElementsHidden={trainingOpen}
        importantForAccessibility={trainingOpen ? 'no-hide-descendants' : 'auto'}
        pointerEvents={trainingOpen ? 'none' : 'auto'}
        style={[styles.header, compact && styles.headerCompact, compact && scrollMobile && { height: 'auto', minHeight: 56 }]}
      >
        <View accessible accessibilityLabel="Tactirook" style={styles.brand}>
          <Image aria-hidden testID="brand-icon" source={require('./assets/icon-app.png')} style={styles.brandMark} />
          {!compact && <Text style={styles.brandText}>Tacti<Text style={styles.brandLight}>rook</Text><Text aria-hidden style={styles.accent}>.</Text></Text>}
        </View>
        {compact && (
          <View style={styles.mobileHeaderInfo}>
            {trainer.hasPuzzle && <Text style={styles.mobilePuzzleId} numberOfLines={scrollMobile ? undefined : 1}>{t('puzzleId', { id: trainer.puzzle.id })}</Text>}
            <View style={styles.mobileMetadata}>
              <Text style={styles.mobilePuzzleDetails} numberOfLines={scrollMobile ? undefined : 1}>{challengeName}</Text>
              {trainer.enabled && !hidePuzzleRating && <Text style={styles.mobilePuzzleRating} numberOfLines={scrollMobile ? undefined : 1}>{t('rating', { rating: number(trainer.puzzle.rating) })}</Text>}
            </View>
          </View>
        )}
        <Pressable
          ref={trainingButton}
          accessibilityRole="button"
          accessibilityLabel={t('training')}
          accessibilityState={{ expanded: trainingOpen }}
          aria-expanded={trainingOpen}
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
        <ScrollView testID="mobile-scroll" scrollEnabled={scrollMobile} style={styles.mobileScroll} contentContainerStyle={styles.mobileScrollContent}>
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
          {boardPosition === 'center' && <View testID="mobile-board-spacer" aria-hidden style={{ height: mobileBoardTopGap }} />}
          <View testID="mobile-board" style={[styles.mobileBoard, { width: mobileBoardSize }]}>
            {trainer.hasPuzzle && <Board trainer={trainer} selected={selected} setSelected={setSelected} edgeToEdge />}
          </View>
          <View testID="mobile-feedback" accessibilityLiveRegion="polite" aria-live="polite" style={styles.mobileFeedback}>
            <View testID="feedback-icon" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.mobileFeedbackIcon, showFeedbackKing && styles.kingIconBackground, trainer.status === 'wrong' && styles.feedbackWrong, trainer.status === 'success' && styles.feedbackSuccess]}>
              {showFeedbackKing
                ? <SvgXml testID="feedback-king" xml={pieceXml[pieceSet][trainer.side].k} width={34} height={34} />
                : <Text style={styles.feedbackIconText}>{trainer.status === 'success' ? '✓' : trainer.status === 'wrong' ? '↻' : '♔'}</Text>}
            </View>
            <View style={styles.mobileFeedbackText}>
              <Text style={styles.mobileFeedbackTitle}>{feedback[0]}</Text>
              <Text style={styles.mobileFeedbackDescription}>{trainer.enabled ? t('youPlaySentence', { side: t(trainer.side === 'w' ? 'white' : 'black'), message: feedback[1] }) : feedback[1]}</Text>
              {trainer.error && <Pressable accessibilityRole="button" accessibilityLabel={t('retryLoading')} onPress={trainer.retry} style={styles.retryButton}><Text style={styles.retryText}>{t('retry')}</Text></Pressable>}
            </View>
          </View>
          <View style={styles.mobileActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('restartPuzzle')} disabled={!trainer.enabled} onPress={reset} style={[styles.mobileAction, !trainer.enabled && styles.disabled]}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <Path d="M3 3v5h5" />
              </Svg>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('next')} disabled={!trainer.enabled} onPress={next} style={[styles.mobileAction, !trainer.enabled && styles.disabled]}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 12h16M14 6l6 6-6 6" />
              </Svg>
            </Pressable>
          </View>
        </View>
        </ScrollView>
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
                  <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.challengeIcon}><Text style={styles.challengeIconText}>◎</Text></View>
                  <View style={styles.challengeText}>
                    <Text style={styles.currentLabel}>{t('currentChallenge')}</Text>
                    <Text style={styles.challengeName} numberOfLines={2}>
                      {challengeName}
                    </Text>
                  </View>
                  {trainer.enabled && !hidePuzzleRating && <Text style={styles.rating}>★  {t('rating', { rating: number(trainer.puzzle.rating) })}</Text>}
                </View>
                <View style={styles.challengeActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={t('next')} disabled={!trainer.enabled} onPress={next} style={[styles.nextButton, !trainer.enabled && styles.disabled]}>
                    <Text style={styles.nextButtonText}>{t('next')}  →</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={t('restartPuzzle')} disabled={!trainer.enabled} onPress={reset} style={[styles.resetButton, !trainer.enabled && styles.disabled]}>
                    <Text style={styles.resetText}>↻  {t('restart')}</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.boardLine}>
                <Text aria-hidden style={styles.boardIcon}>♚</Text>
                <Text style={styles.boardLineText}>{t('chessPuzzle')}</Text>
                {trainer.hasPuzzle && <Text style={styles.lineEnd}>#{trainer.puzzle.id}</Text>}
              </View>
              {trainer.hasPuzzle && <Board trainer={trainer} selected={selected} setSelected={setSelected} />}
              <View style={styles.boardLine}>
                <Text aria-hidden style={styles.boardIcon}>♔</Text>
                {trainer.hasPuzzle && <Text style={styles.boardLineText}>{t('youPlay', { side: t(trainer.side === 'w' ? 'white' : 'black').toLocaleUpperCase(language) })}</Text>}
                {trainer.hasPuzzle && !hidePuzzleType && <Text style={styles.lineEnd}>{t('moves', { played: number(Math.min(progress, trainer.playerMoves)), total: number(trainer.playerMoves) })}</Text>}
              </View>
            </View>
            <View accessibilityLiveRegion="polite" aria-live="polite" style={[styles.feedback, trainer.status === 'wrong' && styles.feedbackWrong, trainer.status === 'success' && styles.feedbackSuccess]}>
              <View testID="feedback-icon" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.feedbackIcon, showFeedbackKing && styles.kingIconBackground]}>
                {showFeedbackKing
                  ? <SvgXml testID="feedback-king" xml={pieceXml[pieceSet][trainer.side].k} width={28} height={28} />
                  : <Text style={styles.feedbackIconText}>{trainer.status === 'success' ? '✓' : trainer.status === 'wrong' ? '↻' : '◎'}</Text>}
              </View>
              <View style={styles.feedbackText}>
                <Text style={styles.feedbackTitle}>{feedback[0]}</Text>
                <Text style={styles.feedbackDescription}>{feedback[1]}</Text>
                {trainer.error && <Pressable accessibilityRole="button" accessibilityLabel={t('retryLoading')} onPress={trainer.retry} style={styles.retryButton}><Text style={styles.retryText}>{t('retry')}</Text></Pressable>}
              </View>
              {trainer.status === 'success' && trainer.enabled && (
                <Pressable accessibilityRole="button" accessibilityLabel={t('next')} onPress={next} style={styles.feedbackNext}><Text style={styles.nextButtonText}>→</Text></Pressable>
              )}
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>TACTIROOK</Text>
          {credits}
        </View>
      </ScrollView>
      )}

      {trainingOpen && (
        <>
          {!compact && <Pressable accessibilityRole="button" accessibilityLabel={t('closeMenu')} aria-hidden tabIndex={-1} onPress={closeTraining} style={styles.menuBackdrop} />}
          <View
            testID="training-menu"
            role="dialog"
            aria-modal
            accessibilityLabel={t('trainingSettings')}
            accessibilityViewIsModal
            onAccessibilityEscape={closeTraining}
            style={[
              styles.trainingMenu,
              compact
                ? [styles.trainingMenuCompact, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]
                : { maxHeight: Math.max(100, height - insets.top - insets.bottom - 82) },
            ]}
          >
            <View testID="training-menu-header" style={[styles.trainingHeaderContainer, compact && styles.trainingHeaderContainerCompact]}>
              <Text style={styles.kicker}>{t('training').toLocaleUpperCase(language)}  ──</Text>
              <View style={styles.trainingHeader}>
                <Text accessibilityRole="header" style={[styles.trainingTitle, compact && styles.trainingTitleCompact]}>{t('trainingSettings')}<Text aria-hidden style={styles.accent}>.</Text></Text>
                <Pressable testID="close-training" ref={closeTrainingButton} accessibilityRole="button" accessibilityLabel={t('closeSettings')} onPress={closeTraining} style={styles.closeTraining}>
                  <Text style={styles.closeTrainingText}>✕</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView testID="training-menu-scroll" style={styles.trainingScroll} contentContainerStyle={compact ? { paddingBottom: insets.bottom } : undefined} keyboardShouldPersistTaps="handled">
              {training}
            </ScrollView>
          </View>
        </>
      )}
    </SafeAreaView>
  )
}

function AppContent() {
  const { t } = useLocalization()
  const { theme } = useTheme()
  const styles = theme === 'dark' ? darkStyles : lightStyles
  const [loaded, error] = useFonts({
    DMSans: require('./assets/fonts/DMSans.ttf'),
    DMSerif: require('./assets/fonts/DMSerifDisplay-Regular.ttf'),
  })

  useEffect(() => {
    if (error) console.error('Unable to load the app fonts', error)
  }, [error])
  if (error) return <View style={styles.loading}><Text style={styles.feedbackTitle}>{t('fontError')}</Text></View>
  if (!loaded) return <View style={styles.loading}><Text style={styles.feedbackTitle}>{t('loadingApp')}</Text></View>

  return <TrainingApp />
}

export default function App() {
  return <SafeAreaProvider><LocalizationProvider><ThemeProvider><AppContent /></ThemeProvider></LocalizationProvider></SafeAreaProvider>
}
