import 'package:decimal/decimal.dart';

class DashboardSummary {
  final Decimal netPosition;
  final Decimal totalReceivable;
  final Decimal totalPayable;
  final Decimal totalLent;
  final Decimal totalBorrowed;
  final Decimal totalRepaidToYou;
  final Decimal totalReturnedToOthers;
  final int openReceivableCount;
  final int openPayableCount;

  DashboardSummary({
    required this.netPosition,
    required this.totalReceivable,
    required this.totalPayable,
    required this.totalLent,
    required this.totalBorrowed,
    required this.totalRepaidToYou,
    required this.totalReturnedToOthers,
    required this.openReceivableCount,
    required this.openPayableCount,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    Decimal parseDec(dynamic v) => Decimal.tryParse(v?.toString() ?? '0.00') ?? Decimal.zero;

    return DashboardSummary(
      netPosition: parseDec(json['net_position']),
      totalReceivable: parseDec(json['total_receivable']),
      totalPayable: parseDec(json['total_payable']),
      totalLent: parseDec(json['total_lent']),
      totalBorrowed: parseDec(json['total_borrowed']),
      totalRepaidToYou: parseDec(json['total_repaid_to_you']),
      totalReturnedToOthers: parseDec(json['total_returned_to_others']),
      openReceivableCount: (json['open_receivable_count'] as num?)?.toInt() ?? 0,
      openPayableCount: (json['open_payable_count'] as num?)?.toInt() ?? 0,
    );
  }
}
