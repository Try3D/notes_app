import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/auth_provider.dart';
import '../providers/data_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/hand_drawn_widgets.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _showUUID = false;
  bool _showDeleteConfirm = false;
  bool _deleting = false;
  bool _copied = false;
  String? _importStatus;
  bool _importSuccess = false;

  Future<void> _handleCopyUUID() async {
    final auth = context.read<AuthProvider>();
    if (auth.uuid != null) {
      await Clipboard.setData(ClipboardData(text: auth.uuid!));
      setState(() => _copied = true);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _copied = false);
      });
    }
  }

  void _handleExport() {
    final data = context.read<DataProvider>();
    final exportData = data.exportData();
    if (exportData == null) return;

    final jsonStr = const JsonEncoder.withIndent('  ').convert(exportData);

    Clipboard.setData(ClipboardData(text: jsonStr));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Data copied to clipboard!',
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(color: Colors.white),
        ),
        backgroundColor: AppColors.green,
      ),
    );
  }

  Future<void> _handleImport() async {
    final clipboardData = await Clipboard.getData('text/plain');
    if (clipboardData?.text == null) {
      setState(() {
        _importStatus = 'No data in clipboard';
        _importSuccess = false;
      });
      return;
    }

    try {
      final json = jsonDecode(clipboardData!.text!);
      final data = context.read<DataProvider>();
      final result = data.importData(json);

      setState(() {
        if (result.success) {
          _importStatus =
              'Imported ${result.tasksImported} tasks and ${result.linksImported} links successfully!';
          _importSuccess = true;
        } else {
          _importStatus = result.error ?? 'Import failed';
          _importSuccess = false;
        }
      });
    } catch (e) {
      setState(() {
        _importStatus = 'Invalid JSON format';
        _importSuccess = false;
      });
    }
  }

  Future<void> _handleLogout() async {
    final auth = context.read<AuthProvider>();
    await auth.logout();
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  Future<void> _handleDeleteAccount() async {
    final auth = context.read<AuthProvider>();
    if (auth.uuid == null) return;

    setState(() => _deleting = true);

    try {
      final api = ApiService(uuid: auth.uuid);
      await api.deleteAccount();
      await auth.logout();

      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/login');
      }
    } catch (e) {
      setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final theme = context.watch<ThemeProvider>();
    final maskedUUID = auth.uuid?.replaceAll(RegExp(r'.'), '*') ?? '';

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Settings',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 20),
                _buildThemeSection(theme),
                const SizedBox(height: 20),
                _buildSection(
                  title: 'Your Secret Code',
                  description:
                      'This is your unique identifier. Keep it safe - it\'s the only way to access your data.',
                  child: _buildUUIDDisplay(auth.uuid, maskedUUID),
                ),
                const SizedBox(height: 20),
                _buildSection(
                  title: 'Export Data',
                  description:
                      'Copy all your tasks and links as JSON for backup.',
                  child: _buildExportButton(),
                ),
                const SizedBox(height: 20),
                _buildSection(
                  title: 'Import Data',
                  description:
                      'Restore your tasks and links from a previously exported JSON backup. Copy JSON to clipboard then tap Import.',
                  child: _buildImportSection(),
                ),
                const SizedBox(height: 20),
                _buildLogoutSection(),
                const SizedBox(height: 20),
                _buildDangerSection(),
                const SizedBox(height: 30),
                _buildFooter(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildThemeSection(ThemeProvider theme) {
    return HandDrawnCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Appearance', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text(
            'Choose your preferred theme.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              _buildThemeOption(
                theme: theme,
                isDark: false,
                label: 'Light',
                icon: Icons.light_mode,
              ),
              const SizedBox(width: 12),
              _buildThemeOption(
                theme: theme,
                isDark: true,
                label: 'Dark',
                icon: Icons.dark_mode,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildThemeOption({
    required ThemeProvider theme,
    required bool isDark,
    required String label,
    required IconData icon,
  }) {
    final isSelected = theme.isDark == isDark;

    return Expanded(
      child: GestureDetector(
        onTap: () {
          if (!isSelected) theme.toggleTheme();
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.blue : Colors.transparent,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
              color: isSelected ? AppColors.blue : context.borderColor,
              width: 2,
            ),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: isSelected ? Colors.white : context.mutedColor,
                size: 24,
              ),
              const SizedBox(width: 12),
              Text(
                label,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: isSelected ? Colors.white : context.textColor,
                  fontWeight: isSelected ? FontWeight.w600 : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required String description,
    required Widget child,
    bool isDanger = false,
  }) {
    return HandDrawnCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: isDanger ? AppColors.danger : null,
            ),
          ),
          const SizedBox(height: 8),
          Text(description, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 20),
          child,
        ],
      ),
    );
  }

  Widget _buildUUIDDisplay(String? uuid, String maskedUUID) {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: 14),
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
                _showUUID ? (uuid ?? '') : maskedUUID,
                style: TextStyle(
                  fontFamily: 'ShortStack',
                  fontSize: 14,
                  color: context.textColor,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => setState(() => _showUUID = !_showUUID),
            child: Icon(
              _showUUID ? Icons.visibility_off : Icons.visibility,
              color: context.mutedColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: _handleCopyUUID,
            child: Icon(
              _copied ? Icons.check : Icons.copy,
              color: context.mutedColor,
              size: 20,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExportButton() {
    return HandDrawnButton(
      onPressed: _handleExport,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.download, color: context.textColor),
          const SizedBox(width: 10),
          Flexible(child: const Text('Export as JSON')),
        ],
      ),
    );
  }

  Widget _buildImportSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        HandDrawnButton(
          onPressed: _handleImport,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.upload, color: context.textColor),
              const SizedBox(width: 10),
              Flexible(child: const Text('Import from Clipboard')),
            ],
          ),
        ),
        if (_importStatus != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _importSuccess
                  ? (context.isDark
                        ? const Color(0xFF14532D)
                        : const Color(0xFFDCFCE7))
                  : (context.isDark
                        ? const Color(0xFF450A0A)
                        : const Color(0xFFFEE2E2)),
              borderRadius: BorderRadius.circular(2),
              border: Border.all(
                color: _importSuccess ? AppColors.green : AppColors.danger,
                width: 2,
              ),
            ),
            child: Text(
              _importStatus!,
              style: TextStyle(
                color: _importSuccess
                    ? (context.isDark
                          ? const Color(0xFFBBF7D0)
                          : const Color(0xFF166534))
                    : (context.isDark
                          ? const Color(0xFFFECACA)
                          : const Color(0xFF991B1B)),
                fontSize: 14,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildLogoutSection() {
    return _buildSection(
      title: 'Logout',
      description: 'Sign out of your account. Your data will remain saved.',
      child: HandDrawnButton(
        onPressed: _handleLogout,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.logout, color: context.textColor),
            const SizedBox(width: 10),
            const Text('Logout'),
          ],
        ),
      ),
    );
  }

  Widget _buildDangerSection() {
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(3),
        border: Border.all(color: AppColors.danger, width: 3),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Danger Zone',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(color: AppColors.danger),
          ),
          const SizedBox(height: 8),
          Text(
            'Permanently delete your account and all associated data. This action cannot be undone.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 20),
          if (!_showDeleteConfirm)
            ElevatedButton.icon(
              onPressed: () => setState(() => _showDeleteConfirm = true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.danger,
                foregroundColor: Colors.white,
              ),
              icon: const Icon(Icons.delete),
              label: const Text('Delete Account'),
            )
          else
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: context.isDark
                        ? const Color(0xFF422006)
                        : const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(
                      color: const Color(0xFFF59E0B),
                      width: 2,
                    ),
                  ),
                  child: Text(
                    'Are you sure? This will permanently delete all your data.',
                    style: TextStyle(
                      color: context.isDark
                          ? const Color(0xFFFCD34D)
                          : const Color(0xFF92400E),
                      fontSize: 14,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ElevatedButton(
                      onPressed: _deleting ? null : _handleDeleteAccount,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.danger,
                        foregroundColor: Colors.white,
                      ),
                      child: Text(
                        _deleting ? 'Deleting...' : 'Yes, Delete Everything',
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: _deleting
                          ? null
                          : () => setState(() => _showDeleteConfirm = false),
                      child: const Text('Cancel'),
                    ),
                  ],
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Made with ', style: Theme.of(context).textTheme.bodySmall),
          const Icon(Icons.favorite, color: AppColors.red, size: 16),
          Text(' by ', style: Theme.of(context).textTheme.bodySmall),
          GestureDetector(
            onTap: () async {
              final uri = Uri.parse('https://github.com/try3d');
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            },
            child: Text(
              'try3d',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.blue,
                decoration: TextDecoration.underline,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
