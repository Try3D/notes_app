import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/link.dart';
import '../providers/data_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/hand_drawn_widgets.dart';

class LinksScreen extends StatefulWidget {
  const LinksScreen({super.key});

  @override
  State<LinksScreen> createState() => _LinksScreenState();
}

class _LinksScreenState extends State<LinksScreen> {
  bool _showModal = false;
  final _urlController = TextEditingController();
  bool _saving = false;
  String? _dragOverLinkId;
  String? _dragOverEnd;

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _handleAddLink() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    setState(() => _saving = true);

    try {
      String title = url;
      String favicon = '';

      try {
        final uri = Uri.parse(url.startsWith('http') ? url : 'https://$url');
        favicon = 'https://www.google.com/s2/favicons?domain=${uri.host}&sz=64';
        title = uri.host;
      } catch (_) {}

      context.read<DataProvider>().addLink(
        url: url,
        title: title,
        favicon: favicon,
      );

      _urlController.clear();
      setState(() {
        _showModal = false;
        _saving = false;
      });
    } catch (_) {
      setState(() => _saving = false);
    }
  }

  void _handleDelete(String id) {
    context.read<DataProvider>().deleteLink(id);
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url.startsWith('http') ? url : 'https://$url');
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint('Could not launch $url: $e');
    }
  }

  void _handleLinkDrop(
    Link draggedLink, {
    Link? targetLink,
    bool atEnd = false,
  }) {
    final data = context.read<DataProvider>();
    final links = data.links;

    if (targetLink != null && draggedLink.id != targetLink.id) {
      final filteredLinks = links.where((l) => l.id != draggedLink.id).toList();
      final targetIndex = filteredLinks.indexWhere(
        (l) => l.id == targetLink.id,
      );

      if (targetIndex != -1) {
        filteredLinks.insert(targetIndex, draggedLink);
      }

      data.reorderLinks(filteredLinks.map((l) => l.id).toList());
    } else if (atEnd) {
      final filteredLinks = links.where((l) => l.id != draggedLink.id).toList();
      filteredLinks.add(draggedLink);
      data.reorderLinks(filteredLinks.map((l) => l.id).toList());
    }

    setState(() {
      _dragOverLinkId = null;
      _dragOverEnd = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();

    if (data.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Stack(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Text(
                'Links',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
            ),
            Expanded(
              child: data.links.isEmpty
                  ? Center(
                      child: Text(
                        'No links yet. Add one to get started!',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: context.mutedColor,
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: data.links.length + 2,
                      itemBuilder: (context, index) {
                        if (index == data.links.length) {
                          return _buildDropEnd();
                        }
                        if (index == data.links.length + 1) {
                          return _buildAddButton();
                        }
                        return _buildLinkItem(data.links[index]);
                      },
                    ),
            ),
            if (data.links.isEmpty)
              Padding(
                padding: const EdgeInsets.all(20),
                child: _buildAddButton(),
              ),
          ],
        ),
        if (_showModal) _buildModal(),
      ],
    );
  }

  Widget _buildLinkItem(Link link) {
    final isDragOver = _dragOverLinkId == link.id;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        DropIndicator(isVisible: isDragOver),
        DragTarget<Link>(
          onWillAcceptWithDetails: (details) {
            if (details.data.id != link.id) {
              setState(() => _dragOverLinkId = link.id);
            }
            return details.data.id != link.id;
          },
          onLeave: (_) {
            setState(() {
              if (_dragOverLinkId == link.id) _dragOverLinkId = null;
            });
          },
          onAcceptWithDetails: (details) {
            _handleLinkDrop(details.data, targetLink: link);
          },
          builder: (context, candidateData, rejectedData) {
            return LongPressDraggable<Link>(
              data: link,
              feedback: Material(
                elevation: 4,
                borderRadius: BorderRadius.circular(2),
                child: Container(
                  width: 300,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: context.cardColor,
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: context.borderColor, width: 2),
                  ),
                  child: Row(
                    children: [
                      if (link.favicon.isNotEmpty)
                        Image.network(
                          link.favicon,
                          width: 28,
                          height: 28,
                          errorBuilder: (_, __, ___) =>
                              const Icon(Icons.link, size: 28),
                        ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              link.title,
                              style: Theme.of(context).textTheme.titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w600),
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              link.url,
                              style: Theme.of(context).textTheme.bodySmall,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              childWhenDragging: Opacity(
                opacity: 0.4,
                child: _buildLinkContent(link),
              ),
              child: _buildLinkContent(link),
            );
          },
        ),
      ],
    );
  }

  Widget _buildLinkContent(Link link) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(2),
        border: Border.all(color: context.borderColor, width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            const DragHandle(),
            const SizedBox(width: 14),
            Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => _launchUrl(link.url),
                child: Row(
                  children: [
                    if (link.favicon.isNotEmpty)
                      Image.network(
                        link.favicon,
                        width: 28,
                        height: 28,
                        errorBuilder: (_, __, ___) => Icon(
                          Icons.link,
                          size: 28,
                          color: context.mutedColor,
                        ),
                      ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            link.title,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            link.url,
                            style: Theme.of(context).textTheme.bodySmall,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            _buildDeleteButton(link.id),
          ],
        ),
      ),
    );
  }

  Widget _buildDeleteButton(String id) {
    return ElevatedButton(
      onPressed: () => _handleDelete(id),
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.danger,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: const Text('Delete'),
    );
  }

  Widget _buildDropEnd() {
    final isDragOver = _dragOverEnd == 'end';

    return DragTarget<Link>(
      onWillAcceptWithDetails: (details) {
        setState(() => _dragOverEnd = 'end');
        return true;
      },
      onLeave: (_) {
        setState(() => _dragOverEnd = null);
      },
      onAcceptWithDetails: (details) {
        _handleLinkDrop(details.data, atEnd: true);
      },
      builder: (context, candidateData, rejectedData) {
        return Container(
          height: 20,
          margin: const EdgeInsets.only(bottom: 10),
          child: DropIndicator(isVisible: isDragOver),
        );
      },
    );
  }

  Widget _buildAddButton() {
    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 20),
      child: HandDrawnButton(
        onPressed: () => setState(() => _showModal = true),
        isDashed: true,
        isExpanded: true,
        child: Text(
          '+ Add Link',
          style: TextStyle(color: context.mutedColor),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }

  Widget _buildModal() {
    return GestureDetector(
      onTap: () => setState(() => _showModal = false),
      child: Container(
        color: Colors.black54,
        alignment: const Alignment(0, -0.5),
        child: GestureDetector(
          onTap: () {}, // Prevent tap from closing
          child: Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(24),
            constraints: const BoxConstraints(maxWidth: 420),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(2),
              border: Border.all(color: context.borderColor, width: 3),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Add Link',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    IconButton(
                      onPressed: () => setState(() => _showModal = false),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                HandDrawnTextField(
                  controller: _urlController,
                  hintText: 'Paste URL here...',
                  autofocus: true,
                  onEditingComplete: _handleAddLink,
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    OutlinedButton(
                      onPressed: () => setState(() => _showModal = false),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: _saving ? null : _handleAddLink,
                      child: Text(_saving ? 'Saving...' : 'Save'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
