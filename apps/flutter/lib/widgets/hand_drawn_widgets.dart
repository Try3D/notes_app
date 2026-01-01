import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class HandDrawnCard extends StatelessWidget {
  final Widget child;
  final Color? headerColor;
  final String? headerTitle;
  final String? headerSubtitle;
  final bool isDragOver;
  final EdgeInsets? padding;

  const HandDrawnCard({
    super.key,
    required this.child,
    this.headerColor,
    this.headerTitle,
    this.headerSubtitle,
    this.isDragOver = false,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(3),
        border: Border.all(
          color: isDragOver ? AppColors.blue : context.borderColor,
          width: 3,
        ),
        boxShadow: isDragOver
            ? [
                BoxShadow(
                  color: AppColors.blue.withValues(alpha: 0.2),
                  blurRadius: 0,
                  spreadRadius: 3,
                ),
              ]
            : null,
      ),
      transform: isDragOver
          ? Matrix4.diagonal3Values(1.01, 1.01, 1.0)
          : Matrix4.identity(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (headerColor != null && headerTitle != null)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: headerColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(0),
                  topRight: Radius.circular(0),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    headerTitle!,
                    style: Theme.of(
                      context,
                    ).textTheme.titleMedium?.copyWith(color: Colors.white),
                  ),
                  if (headerSubtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      headerSubtitle!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          Padding(padding: padding ?? const EdgeInsets.all(12), child: child),
        ],
      ),
    );
  }
}

class HandDrawnButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final Widget child;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final bool isDashed;
  final bool isExpanded;
  final EdgeInsets? padding;

  const HandDrawnButton({
    super.key,
    this.onPressed,
    required this.child,
    this.backgroundColor,
    this.foregroundColor,
    this.isDashed = false,
    this.isExpanded = false,
    this.padding,
  });

  @override
  State<HandDrawnButton> createState() => _HandDrawnButtonState();
}

class _HandDrawnButtonState extends State<HandDrawnButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final bgColor = widget.backgroundColor ?? context.cardColor;
    final fgColor = widget.foregroundColor ?? context.textColor;

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.onPressed,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: widget.isExpanded ? double.infinity : null,
          padding:
              widget.padding ??
              const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            color: _isHovered ? context.hoverColor : bgColor,
            borderRadius: BorderRadius.circular(2),
            border: Border.all(
              color: context.borderColor,
              width: 2,
              style: widget.isDashed ? BorderStyle.none : BorderStyle.solid,
            ),
          ),
          foregroundDecoration: widget.isDashed
              ? BoxDecoration(
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(
                    color: context.borderColor,
                    width: 2,
                    style: BorderStyle.solid,
                  ),
                )
              : null,
          child: DefaultTextStyle(
            style: Theme.of(
              context,
            ).textTheme.bodyLarge!.copyWith(color: fgColor),
            child: IconTheme(
              data: IconThemeData(color: fgColor),
              child: widget.child,
            ),
          ),
        ),
      ),
    );
  }
}

class HandDrawnCheckbox extends StatelessWidget {
  final bool value;
  final ValueChanged<bool>? onChanged;
  final double size;

  const HandDrawnCheckbox({
    super.key,
    required this.value,
    this.onChanged,
    this.size = 22,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged?.call(!value),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(color: context.borderColor, width: 2),
        ),
        child: value
            ? Center(
                child: Text(
                  '*',
                  style: TextStyle(
                    fontSize: size * 0.8,
                    color: context.textColor,
                    height: 1,
                  ),
                ),
              )
            : null,
      ),
    );
  }
}

class HandDrawnTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String? hintText;
  final int? maxLines;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onEditingComplete;
  final TextInputAction? textInputAction;
  final bool autofocus;
  final FocusNode? focusNode;

  const HandDrawnTextField({
    super.key,
    this.controller,
    this.hintText,
    this.maxLines = 1,
    this.onChanged,
    this.onEditingComplete,
    this.textInputAction,
    this.autofocus = false,
    this.focusNode,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      onChanged: onChanged,
      onEditingComplete: onEditingComplete,
      textInputAction: textInputAction,
      autofocus: autofocus,
      focusNode: focusNode,
      scrollPhysics: const BouncingScrollPhysics(),
      style: const TextStyle(fontFamily: 'ShortStack', fontSize: 16),
      decoration: InputDecoration(
        hintText: hintText,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 14,
        ),
      ),
    );
  }
}

class DragHandle extends StatelessWidget {
  final Color? color;

  const DragHandle({super.key, this.color});

  @override
  Widget build(BuildContext context) {
    return Text(
      '⋮⋮',
      style: TextStyle(
        fontSize: 12,
        letterSpacing: -2,
        color: color ?? context.mutedColor.withValues(alpha: 0.4),
      ),
    );
  }
}

class DropIndicator extends StatelessWidget {
  final bool isVisible;

  const DropIndicator({super.key, this.isVisible = false});

  @override
  Widget build(BuildContext context) {
    if (!isVisible) return const SizedBox.shrink();

    return Container(
      height: 4,
      decoration: BoxDecoration(
        color: AppColors.blue,
        borderRadius: BorderRadius.circular(2),
        boxShadow: [
          BoxShadow(
            color: AppColors.blue.withValues(alpha: 0.5),
            blurRadius: 8,
          ),
        ],
      ),
    );
  }
}

class ColorDot extends StatelessWidget {
  final Color color;
  final double size;
  final bool isSelected;
  final VoidCallback? onTap;

  const ColorDot({
    super.key,
    required this.color,
    this.size = 12,
    this.isSelected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: isSelected
              ? Border.all(color: context.borderColor, width: 2)
              : null,
        ),
        transform: isSelected
            ? Matrix4.diagonal3Values(1.15, 1.15, 1.0)
            : Matrix4.identity(),
      ),
    );
  }
}

class QuadrantBadge extends StatelessWidget {
  final String label;
  final Color color;

  const QuadrantBadge({super.key, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(2),
      ),
      child: Text(
        label,
        style: Theme.of(
          context,
        ).textTheme.labelSmall?.copyWith(color: Colors.white, fontSize: 10),
      ),
    );
  }
}
