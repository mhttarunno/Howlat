import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/colors.dart';

/// Reusable GPU-accelerated frosted glass container
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final bool elevated;
  final Color? borderColor;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.elevated = false,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    final surfaceColor = elevated
        ? HowlatColors.glassElevated.withValues(alpha: 0.82)
        : HowlatColors.glassSurface.withValues(alpha: 0.72);

    final border = borderColor ?? HowlatColors.glassBorder;

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(16),
            splashColor: HowlatColors.primary.withValues(alpha: 0.12),
            highlightColor: Colors.white.withValues(alpha: 0.04),
            child: Container(
              padding: padding ?? const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: surfaceColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: border, width: 1),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: elevated ? 0.35 : 0.20),
                    blurRadius: elevated ? 32 : 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
