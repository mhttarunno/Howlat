import 'package:dio/dio.dart';
import '../../models/summary.dart';
import '../../models/transaction.dart';
import 'api_client.dart';

class LedgerService {
  final ApiClient apiClient;

  LedgerService(this.apiClient);

  Future<DashboardSummary> fetchDashboardSummary() async {
    final response = await apiClient.dio.get('/dashboard/summary');
    return DashboardSummary.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<TransactionItem>> fetchTransactions({
    String? type,
    String? status,
    String? search,
  }) async {
    final queryParams = <String, dynamic>{};
    if (type != null) queryParams['transaction_type'] = type;
    if (status != null) queryParams['status'] = status;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    final response = await apiClient.dio.get(
      '/transactions',
      queryParameters: queryParams,
    );

    final items = (response.data['items'] as List<dynamic>?) ?? [];
    return items
        .map((e) => TransactionItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> createLoan({
    required String personId,
    required String type, // 'LENT' or 'BORROWED'
    required String amount,
    required String transactionDate,
    String? expectedDate,
    String? description,
  }) async {
    await apiClient.dio.post(
      '/transactions',
      data: {
        'person_id': personId,
        'transaction_type': type,
        'amount': amount,
        'transaction_date': transactionDate,
        'expected_date': expectedDate,
        'description': description,
      },
    );
  }

  Future<void> recordRepayment({
    required String transactionId,
    required String amount,
    required String repaymentDate,
    String? notes,
  }) async {
    await apiClient.dio.post(
      '/repayments',
      data: {
        'transaction_id': transactionId,
        'amount': amount,
        'repayment_date': repaymentDate,
        'notes': notes,
      },
    );
  }
}
