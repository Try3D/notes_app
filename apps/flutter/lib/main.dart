import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/data_provider.dart';
import 'providers/theme_provider.dart';
import 'services/storage_service.dart';
import 'theme/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/matrix_screen.dart';
import 'screens/kanban_screen.dart';
import 'screens/todos_screen.dart';
import 'screens/links_screen.dart';
import 'screens/settings_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final storage = await StorageService.init();
  runApp(EisenhowerApp(storage: storage));
}

class EisenhowerApp extends StatelessWidget {
  final StorageService storage;

  const EisenhowerApp({super.key, required this.storage});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider(storage)),
        ChangeNotifierProvider(create: (_) => ThemeProvider(storage)),
        ChangeNotifierProvider(create: (_) => DataProvider(storage)),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          return MaterialApp(
            title: 'NoteGrid',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light(),
            darkTheme: AppTheme.dark(),
            themeMode: themeProvider.themeMode,
            initialRoute: '/',
            routes: {
              '/': (context) => const AuthWrapper(),
              '/login': (context) => const LoginScreen(),
              '/home': (context) => const HomeScreen(),
            },
          );
        },
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.isLoggedIn) {
      return const HomeScreen();
    }
    return const LoginScreen();
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final data = context.read<DataProvider>();
      data.setUUID(auth.uuid);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      final data = context.read<DataProvider>();
      data.onAppResumed();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>();

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth >= 600) {
            return _buildDesktopLayout(theme);
          }
          return _buildMobileLayout(theme);
        },
      ),
    );
  }

  Widget _buildDesktopLayout(ThemeProvider theme) {
    return Row(
      children: [
        _buildSidebar(theme),
        Expanded(child: _buildContent()),
      ],
    );
  }

  Widget _buildMobileLayout(ThemeProvider theme) {
    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          Expanded(child: _buildContent()),
          _buildBottomNav(theme),
        ],
      ),
    );
  }

  Widget _buildSidebar(ThemeProvider theme) {
    return Container(
      width: 64,
      decoration: BoxDecoration(
        color: context.bgColor,
        border: Border(right: BorderSide(color: context.borderColor, width: 3)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 14),
          _buildNavItem(0, Icons.check_circle_outline, 'Todos'),
          _buildNavItem(1, Icons.grid_view, 'Matrix'),
          _buildNavItem(2, Icons.view_kanban_outlined, 'Kanban'),
          _buildNavItem(3, Icons.link, 'Links'),
          _buildNavItem(4, Icons.settings, 'Settings'),
          const Spacer(),
          const SizedBox(height: 14),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = _selectedIndex == index;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Tooltip(
        message: label,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => setState(() => _selectedIndex = index),
            borderRadius: BorderRadius.circular(2),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.blue : Colors.transparent,
                borderRadius: BorderRadius.circular(2),
                border: Border.all(
                  color: isSelected ? context.borderColor : Colors.transparent,
                  width: 2,
                ),
              ),
              child: Icon(
                icon,
                color: isSelected ? Colors.white : context.borderColor,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBottomNav(ThemeProvider theme) {
    return Container(
      decoration: BoxDecoration(
        color: context.bgColor,
        border: Border(top: BorderSide(color: context.borderColor, width: 3)),
      ),
      child: SafeArea(
        top: false,
        minimum: const EdgeInsets.only(bottom: 4),
        child: Row(
          children: [
            _buildBottomNavItem(0, Icons.check_circle_outline, 'Todos'),
            _buildBottomNavItem(1, Icons.grid_view, 'Matrix'),
            _buildBottomNavItem(2, Icons.view_kanban_outlined, 'Kanban'),
            _buildBottomNavItem(3, Icons.link, 'Links'),
            _buildBottomNavItem(4, Icons.settings, 'Settings'),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNavItem(int index, IconData icon, String label) {
    final isSelected = _selectedIndex == index;

    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedIndex = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: isSelected ? AppColors.blue : context.mutedColor,
                size: 22,
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: isSelected ? AppColors.blue : context.mutedColor,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    switch (_selectedIndex) {
      case 0:
        return const TodosScreen();
      case 1:
        return const MatrixScreen();
      case 2:
        return const KanbanScreen();
      case 3:
        return const LinksScreen();
      case 4:
        return const SettingsScreen();
      default:
        return const TodosScreen();
    }
  }
}
