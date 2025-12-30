import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/hand_drawn_widgets.dart';

enum LoginView { main, generate, enter }

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  LoginView _view = LoginView.main;
  String _generatedCode = '';
  final _codeController = TextEditingController();
  bool _saved = false;
  bool _copied = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  void _handleGenerate() {
    final auth = context.read<AuthProvider>();
    setState(() {
      _generatedCode = auth.generateUUID();
      _saved = false;
      _view = LoginView.generate;
    });
  }

  Future<void> _handleCopy() async {
    await Clipboard.setData(ClipboardData(text: _generatedCode));
    setState(() => _copied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  Future<void> _handleContinue() async {
    if (!_saved) return;
    final auth = context.read<AuthProvider>();
    final success = await auth.register(_generatedCode);
    if (success && mounted) {
      Navigator.of(context).pushReplacementNamed('/home');
    }
  }

  Future<void> _handleLogin() async {
    final auth = context.read<AuthProvider>();
    final success = await auth.login(_codeController.text.trim());
    if (success && mounted) {
      Navigator.of(context).pushReplacementNamed('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.read<ThemeProvider>();

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: HandDrawnCard(
              padding: const EdgeInsets.all(40),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'NoteGrid',
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your personal productivity companion',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 30),
                  _buildView(),
                ],
              ),
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: theme.toggleTheme,
        backgroundColor: context.cardColor,
        foregroundColor: context.textColor,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(2),
          side: BorderSide(color: context.borderColor, width: 2),
        ),
        child: Icon(theme.isDark ? Icons.light_mode : Icons.dark_mode),
      ),
    );
  }

  Widget _buildView() {
    switch (_view) {
      case LoginView.main:
        return _buildMainView();
      case LoginView.generate:
        return _buildGenerateView();
      case LoginView.enter:
        return _buildEnterView();
    }
  }

  Widget _buildMainView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'This app uses a simple secret code instead of username/password. '
          'Your code is your identity - keep it safe!',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 20),
        _buildPrimaryButton(
          onPressed: _handleGenerate,
          child: const Text('Generate New Code'),
        ),
        const SizedBox(height: 12),
        _buildSecondaryButton(
          onPressed: () {
            context.read<AuthProvider>().clearError();
            setState(() {
              _view = LoginView.enter;
              _codeController.clear();
            });
          },
          child: const Text('I Have a Code'),
        ),
      ],
    );
  }

  Widget _buildGenerateView() {
    final auth = context.watch<AuthProvider>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildWarningBox(
          'This is your secret code. Save it somewhere safe - you won\'t see it again!',
        ),
        const SizedBox(height: 20),
        _buildCodeDisplay(),
        const SizedBox(height: 20),
        _buildCheckboxRow(),
        if (auth.error != null) ...[
          const SizedBox(height: 8),
          Text(
            auth.error!,
            style: TextStyle(color: AppColors.danger, fontSize: 14),
          ),
        ],
        const SizedBox(height: 20),
        _buildPrimaryButton(
          onPressed: _saved && !auth.isLoading ? _handleContinue : null,
          child: Text(auth.isLoading ? 'Setting up...' : 'Continue to App'),
        ),
        const SizedBox(height: 12),
        _buildSecondaryButton(
          onPressed: () => setState(() => _view = LoginView.main),
          child: const Text('Back'),
        ),
      ],
    );
  }

  Widget _buildEnterView() {
    final auth = context.watch<AuthProvider>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Enter your secret code to access your data.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 20),
        HandDrawnTextField(
          controller: _codeController,
          hintText: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          onEditingComplete: _handleLogin,
        ),
        if (auth.error != null) ...[
          const SizedBox(height: 8),
          Text(
            auth.error!,
            style: TextStyle(color: AppColors.danger, fontSize: 14),
          ),
        ],
        const SizedBox(height: 20),
        _buildPrimaryButton(
          onPressed: auth.isLoading ? null : _handleLogin,
          child: Text(auth.isLoading ? 'Checking...' : 'Login'),
        ),
        const SizedBox(height: 12),
        _buildSecondaryButton(
          onPressed: () => setState(() => _view = LoginView.main),
          child: const Text('Back'),
        ),
      ],
    );
  }

  Widget _buildWarningBox(String text) {
    final isDark = context.isDark;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF422006) : const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(2),
        border: Border.all(
          color: const Color(0xFFF59E0B),
          width: 2,
        ),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: isDark ? const Color(0xFFFCD34D) : const Color(0xFF92400E),
          fontSize: 14,
        ),
      ),
    );
  }

  Widget _buildCodeDisplay() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.bgColor,
        borderRadius: BorderRadius.circular(2),
        border: Border.all(color: context.borderColor, width: 2),
      ),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Text(
                _generatedCode,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontFamily: 'ShortStack',
                      color: context.textColor,
                    ),
              ),
            ),
          ),
          IconButton(
            onPressed: _handleCopy,
            icon: Icon(
              _copied ? Icons.check : Icons.copy,
              size: 20,
              color: context.mutedColor,
            ),
            tooltip: 'Copy to clipboard',
          ),
        ],
      ),
    );
  }

  Widget _buildCheckboxRow() {
    return GestureDetector(
      onTap: () => setState(() => _saved = !_saved),
      child: Row(
        children: [
          HandDrawnCheckbox(
            value: _saved,
            onChanged: (v) => setState(() => _saved = v),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Text(
              'I have saved my code safely',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrimaryButton({
    required VoidCallback? onPressed,
    required Widget child,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: onPressed,
        child: child,
      ),
    );
  }

  Widget _buildSecondaryButton({
    required VoidCallback onPressed,
    required Widget child,
  }) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onPressed,
        child: child,
      ),
    );
  }
}
