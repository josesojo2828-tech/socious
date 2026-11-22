import 'package:flutter/material.dart';

/// Honest placeholder for a module that has a plan and a task, not code yet.
/// It names what will land there so the navigation is usable from day one.
class ComingSoonPage extends StatelessWidget {
  const ComingSoonPage({
    super.key,
    required this.title,
    required this.icon,
    required this.description,
    this.bullets = const [],
  });

  final String title;
  final IconData icon;
  final String description;
  final List<String> bullets;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 24),
        Icon(icon, size: 48, color: theme.colorScheme.primary),
        const SizedBox(height: 16),
        Text(
          title,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          description,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        if (bullets.isNotEmpty) ...[
          const SizedBox(height: 20),
          for (final bullet in bullets)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.radio_button_unchecked,
                    size: 14,
                    color: theme.colorScheme.secondary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: Text(bullet)),
                ],
              ),
            ),
        ],
        const SizedBox(height: 24),
        Chip(
          avatar: const Icon(Icons.construction, size: 16),
          label: const Text('En construcción'),
          backgroundColor: theme.colorScheme.surfaceContainerHighest,
          side: BorderSide.none,
        ),
      ],
    );
  }
}
