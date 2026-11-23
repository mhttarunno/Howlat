import 'package:decimal/decimal.dart';

class TransactionItem {
  final String id;
  final String? ref;
  final String type; // 'LENT' or 'BORROWED'
  final String personId;
  final String personName;
  final Decimal amount;
  final Decimal paidTotal;
  final Decimal remainingAmount;
  final String status; // 'UNPAID', 'PARTIALLY_PAID', 'FULLY_PAID'
  final String transactionDate;
  final String? expectedDate;
  final String? description;
  final bool isOverdue;

  TransactionItem({
    required this.id,
    this.ref,
    required this.type,
    required this.personId,
    required this.personName,
    required this.amount,
    required this.paidTotal,
    required this.remainingAmount,
    required this.status,
    required this.transactionDate,
    this.expectedDate,
    this.description,
    this.isOverdue = false,
  });

  factory TransactionItem.fromJson(Map<String, dynamic> json) {
    Decimal parseDec(dynamic v) => Decimal.tryParse(v?.toString() ?? '0.00') ?? Decimal.zero;

    return TransactionItem(
      id: json['id']?.toString() ?? '',
      ref: json['ref']?.toString(),
      type: json['transaction_type']?.toString() ?? 'LENT',
      personId: json['person_id']?.toString() ?? '',
      personName: json['person_name']?.toString() ?? 'Unknown',
      amount: parseDec(json['amount']),
      paidTotal: parseDec(json['paid_total']),
      remainingAmount: parseDec(json['remaining_amount'] ?? json['outstanding_amount']),
      status: json['status']?.toString() ?? 'UNPAID',
      transactionDate: json['transaction_date']?.toString() ?? '',
      expectedDate: json['expected_date']?.toString(),
      description: json['description']?.toString(),
      isOverdue: json['is_overdue'] == true,
    );
  }
}
