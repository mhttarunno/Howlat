import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/services/api_client.dart';
import '../../core/services/ledger_service.dart';
import '../../core/theme/colors.dart';
import '../../core/widgets/glass_card.dart';
import '../../models/summary.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final LedgerService _ledgerService;
  DashboardSummary? _summary;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _ledgerService = LedgerService(ApiClient());
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final summary = await _ledgerService.fetchDashboardSummary();
      if (mounted) {
        setState(() {
          _summary = summary;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Could not connect to Howlat ledger server.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HowlatColors.background,
      body: Stack(
        children: [
          // Ambient blurred background orbs (matching web UI)
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: HowlatColors.primary.withValues(alpha: 0.12),
              ),
            ),
          ),
          Positioned(
            bottom: 100,
            right: -80,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF06B6D4).withValues(alpha: 0.08),
              ),
            ),
          ),

          SafeArea(
            child: RefreshIndicator(
              onRefresh: _loadData,
              color: HowlatColors.primary,
              backgroundColor: HowlatColors.glassElevated,
              child: CustomScrollView(
                slivers: [
                  // App Bar
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF2563EB), Color(0xFF0284C7)],
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF2563EB).withValues(alpha: 0.4),
                                      blurRadius: 16,
                                    ),
                                  ],
                                ),
                                child: const Icon(LucideIcons.wallet, color: Colors.white, size: 20),
                              ),
                              const SizedBox(width: 12),
                              const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Howlat',
                                    style: TextStyle(
                                      color: HowlatColors.textPrimary,
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                  Text(
                                    'FINTECH LEDGER',
                                    style: TextStyle(
                                      color: HowlatColors.textMuted,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: 1.0,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          IconButton(
                            onPressed: _loadData,
                            icon: const Icon(LucideIcons.refreshCw, color: HowlatColors.textSecondary, size: 20),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Main Content
                  if (_isLoading)
                    const SliverFillRemaining(
                      child: Center(
                        child: CircularProgressIndicator(color: HowlatColors.primary),
                      ),
                    )
                  else if (_error != null)
                    SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(_error!, style: const TextStyle(color: HowlatColors.danger)),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: _loadData,
                              style: ElevatedButton.styleFrom(backgroundColor: HowlatColors.primary),
                              child: const Text('Retry', style: TextStyle(color: Colors.white)),
                            ),
                          ],
                        ),
                      ),
                    )
                  else ...[
                    // Net Ledger Position (Centerpiece Glass Card)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                        child: GlassCard(
                          elevated: true,
                          borderColor: HowlatColors.success.withValues(alpha: 0.35),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: HowlatColors.successSoft,
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: const Icon(LucideIcons.scale, color: HowlatColors.success, size: 20),
                                      ),
                                      const SizedBox(width: 10),
                                      const Text(
                                        'NET LEDGER POSITION',
                                        style: TextStyle(
                                          color: HowlatColors.textSecondary,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          letterSpacing: 0.8,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: HowlatColors.successSoft,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: HowlatColors.success.withValues(alpha: 0.3)),
                                    ),
                                    child: const Text(
                                      'Receivable',
                                      style: TextStyle(color: HowlatColors.success, fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Text(
                                '৳ ${_summary?.netPosition.toString() ?? '0.00'}',
                                style: const TextStyle(
                                  color: HowlatColors.success,
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Overall: others owe you more than you owe',
                                style: TextStyle(color: HowlatColors.textMuted, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // Two Cards Grid (Outstanding Receivable & Payable)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: GlassCard(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('OUTSTANDING RECEIVABLE', style: TextStyle(color: HowlatColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 8),
                                    Text('৳ ${_summary?.totalReceivable.toString() ?? '0.00'}', style: const TextStyle(color: HowlatColors.textPrimary, fontSize: 20, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 4),
                                    Text('${_summary?.openReceivableCount ?? 0} open · owed to you', style: const TextStyle(color: HowlatColors.textMuted, fontSize: 11)),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: GlassCard(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('OUTSTANDING PAYABLE', style: TextStyle(color: HowlatColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 8),
                                    Text('৳ ${_summary?.totalPayable.toString() ?? '0.00'}', style: const TextStyle(color: HowlatColors.warning, fontSize: 20, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 4),
                                    Text('${_summary?.openPayableCount ?? 0} open · you owe', style: const TextStyle(color: HowlatColors.textMuted, fontSize: 11)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Action Buttons Row
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        child: Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  // Open Give Money Dialog
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF1E293B),
                                  foregroundColor: HowlatColors.warning,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: BorderSide(color: HowlatColors.warning.withValues(alpha: 0.3)),
                                  ),
                                ),
                                icon: const Icon(LucideIcons.arrowUpRight, size: 16),
                                label: const Text('Give money', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  // Open Receive Money Dialog
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF1E293B),
                                  foregroundColor: HowlatColors.success,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: BorderSide(color: HowlatColors.success.withValues(alpha: 0.3)),
                                  ),
                                ),
                                icon: const Icon(LucideIcons.arrowDownLeft, size: 16),
                                label: const Text('Receive', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SliverToBoxAdapter(child: SizedBox(height: 40)),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
