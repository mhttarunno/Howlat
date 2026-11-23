import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { balances, baseRoutes, EMPTY_SUMMARY, entry, mockApi, page, person, renderApp } from './utils'

const dashRoutes = (summary: object = EMPTY_SUMMARY) => ({
  ...baseRoutes(),
  'GET /dashboard/summary': summary,
  'GET /dashboard/charts': { months: [], receivable: '0.00', payable: '0.00' },
  'GET /dashboard/recent-activity': page([]),
})

describe('authentication & navigation', () => {
  it('redirects signed-out users to login and keeps the intended page', async () => {
    mockApi({})
    const { router } = renderApp('/people', { authed: false })
    await screen.findByRole('heading', { name: 'Welcome back' })
    expect(router.state.location.pathname).toBe('/login')
    expect((router.state.location.state as { from: string }).from).toBe('/people')
  })

  it('validates the login form before calling the API', async () => {
    const api = mockApi({})
    renderApp('/login', { authed: false })
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your email')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.type(screen.getByLabelText('Password'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('shows the server error for wrong credentials and stays on login', async () => {
    mockApi({ 'POST /auth/login': () => ({ status: 401, body: { detail: 'Invalid email or password', code: 'unauthorized' } }) })
    renderApp('/login', { authed: false })
    await userEvent.type(await screen.findByLabelText('Email'), 'me@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
    expect(localStorage.getItem('howlat.token')).toBeNull()
  })

  it('logs in and lands on the dashboard', async () => {
    mockApi({ ...dashRoutes(), 'POST /auth/login': { access_token: 'tok', token_type: 'bearer', user: { ...baseRoutes()['GET /auth/me'] } } })
    renderApp('/login', { authed: false })
    await userEvent.type(await screen.findByLabelText('Email'), 'me@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: 'Hello, Tanvir' })).toBeInTheDocument()
    expect(localStorage.getItem('howlat.token')).toBe('tok')
  })

  it('navigates between every main section from the sidebar', async () => {
    mockApi({
      ...dashRoutes(), 'GET /people': page([]), 'GET /transactions': page([]),
      'GET /reports/summary': { start: null, end: null, lent: '0.00', borrowed: '0.00', repayments_received: '0.00', repayments_returned: '0.00', loan_count: 0, repayment_count: 0, outstanding_receivable: '0.00', outstanding_payable: '0.00', net_position: '0.00' },
      'GET /reports/monthly': { start: null, end: null, rows: [], totals: { month: 'Total', lent: '0.00', borrowed: '0.00', received: '0.00', returned: '0.00', loan_count: 0, repayment_count: 0 } },
      'GET /reports/yearly': { rows: [] }, 'GET /reports/people': { rows: [], totals: null },
    })
    renderApp('/')
    await screen.findByRole('heading', { name: 'Hello, Tanvir' })
    const side = screen.getByRole('navigation', { name: 'Main' })
    for (const [link, heading] of [['People', 'People'], ['Transactions', 'Transactions'], ['Money Given', 'Money Given'], ['Money Received', 'Money Received'], ['Reports & Analytics', 'Reports & Analytics'], ['Settings', 'Settings']] as const) {
      await userEvent.click(within(side).getByRole('link', { name: link }))
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    }
  })

  it('exposes mobile bottom navigation alongside the sidebar', async () => {
    mockApi(dashRoutes())
    renderApp('/')
    await screen.findByRole('heading', { name: 'Hello, Tanvir' })
    const bottom = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(bottom).getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(within(bottom).getByRole('button', { name: 'Record repayment' })).toBeInTheDocument()
    expect(bottom.className).toContain('lg:hidden') // phones/tablets only; desktop uses the sidebar
  })
})

describe('dashboard states', () => {
  it('shows a helpful empty state when there is no data', async () => {
    mockApi(dashRoutes())
    renderApp('/')
    expect(await screen.findByText('Record your first transaction')).toBeInTheDocument()
    expect(screen.getByText('All settled')).toBeInTheDocument()
  })

  it('shows backend figures, distinguishing receivable from payable', async () => {
    mockApi(dashRoutes({
      ...EMPTY_SUMMARY, total_lent: '500000.00', total_borrowed: '300000.00', total_received_back: '100000.00', total_returned: '100000.00',
      outstanding_receivable: '400000.00', outstanding_payable: '200000.00', net_position: '200000.00', position: 'NET_RECEIVABLE', open_receivables: 2, open_payables: 1,
      top_receivables: [{ person_id: 'p1', name: 'Rahim', archived: false, ...balances({ receivable: '400000.00' }) }],
    }))
    renderApp('/')
    expect(await screen.findByText('Net receivable')).toBeInTheDocument()
    expect(screen.getAllByText('৳4,00,000').length).toBeGreaterThan(0) // lakh grouping
    expect(screen.getByText('+৳2,00,000')).toBeInTheDocument()
    expect(screen.getByText('2 open · owed to you')).toBeInTheDocument()
    expect(screen.getByText('1 open · you owe')).toBeInTheDocument()
  })

  it('shows an error with retry instead of fake numbers when the backend is down', async () => {
    mockApi({ ...baseRoutes() })
    // summary/charts/recent are unmocked -> every request rejects
    failNetworkForDashboard()
    renderApp('/')
    expect(await screen.findAllByText(/offline or the server is unreachable/i)).not.toHaveLength(0)
    expect(screen.queryByText('৳0')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /try again/i }).length).toBeGreaterThan(0)
  })

  it('warns about overdue repayments', async () => {
    mockApi(dashRoutes({ ...EMPTY_SUMMARY, total_lent: '100.00', overdue_receivables: 2 }))
    renderApp('/')
    expect(await screen.findByText(/overdue repayments are/i)).toBeInTheDocument()
  })
})

function failNetworkForDashboard() {
  const base = baseRoutes()
  const real = mockApi({ ...base })
  const original = (globalThis.fetch as unknown as (...a: unknown[]) => Promise<Response>)
  ;(globalThis as { fetch: unknown }).fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes('/dashboard/')) throw new TypeError('Failed to fetch')
    return original(input, init)
  }
  return real
}

describe('people', () => {
  it('lists people with balances and searches via the API', async () => {
    const api = mockApi({
      ...baseRoutes(),
      'GET /people': ({ url }: { url: URL }) => ({
        body: page(url.searchParams.get('search') ? [person({ id: 'p2', name: 'Karim', balances: balances({ payable: '2000.00' }), transaction_count: 1 })] : [
          person({ balances: balances({ receivable: '4000.00' }), transaction_count: 1 }),
          person({ id: 'p2', name: 'Karim', balances: balances({ payable: '2000.00' }), transaction_count: 1 }),
          person({ id: 'p3', name: 'Salma', transaction_count: 2, balances: balances({ total_lent: '10.00', repaid_to_me: '10.00' }) }),
        ]),
      }),
    } as never)
    renderApp('/people')
    expect(await screen.findByText('Rahim')).toBeInTheDocument()
    expect(screen.getByText('owes you')).toBeInTheDocument()
    expect(screen.getByText('you owe')).toBeInTheDocument()
    expect(screen.getAllByText('Settled').length).toBeGreaterThan(0)

    await userEvent.type(screen.getByLabelText('Search people'), 'kar')
    await waitFor(() => expect(api.calls.some((c) => c.path === '/people' && c.search.get('search') === 'kar')).toBe(true))
    await waitFor(() => expect(screen.queryByText('Rahim')).not.toBeInTheDocument())
    expect(screen.getByText('Karim')).toBeInTheDocument()
  })

  it('shows an empty state with a call to action', async () => {
    mockApi({ ...baseRoutes(), 'GET /people': page([]) })
    renderApp('/people')
    expect(await screen.findByText('No people yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add your first person/i })).toBeInTheDocument()
  })

  it('validates and submits the add-person form', async () => {
    const api = mockApi({
      ...baseRoutes(), 'GET /people': page([]),
      'POST /people': ({ body }: { body: { name: string } }) => ({ status: 201, body: person({ id: 'new', name: body.name }) }),
    } as never)
    renderApp('/people')
    await userEvent.click(await screen.findByRole('button', { name: /add your first person/i }))
    const dlg = await screen.findByRole('dialog')
    await userEvent.click(within(dlg).getByRole('button', { name: 'Add person' }))
    expect(await within(dlg).findByText('Name is required')).toBeInTheDocument()
    await userEvent.type(within(dlg).getByLabelText(/Email/), 'nope')
    await userEvent.type(within(dlg).getByLabelText(/Full name/), 'Rahim Uddin')
    await userEvent.click(within(dlg).getByRole('button', { name: 'Add person' }))
    expect(await within(dlg).findByText('Enter a valid email')).toBeInTheDocument()
    expect(api.find('POST', '/people')).toHaveLength(0)

    await userEvent.clear(within(dlg).getByLabelText(/Email/))
    await userEvent.click(within(dlg).getByRole('button', { name: 'Add person' }))
    await waitFor(() => expect(api.find('POST', '/people')).toHaveLength(1))
    expect(api.find('POST', '/people')[0]!.body).toMatchObject({ name: 'Rahim Uddin' })
    expect(await screen.findByText('Rahim Uddin added')).toBeInTheDocument()
  })

  it('shows the full individual profile with both directions of balance', async () => {
    mockApi({
      ...baseRoutes(),
      'GET /people/p1': person({ balances: balances({ total_lent: '5000.00', total_borrowed: '1000.00', repaid_to_me: '2000.00', repaid_by_me: '0.00', receivable: '3000.00', payable: '1000.00', net_balance: '2000.00' }), transaction_count: 2 }),
      'GET /transactions': page([entry({ outstanding: '3000.00', paid_total: '2000.00', status: 'PARTIALLY_PAID' })]),
      'GET /repayments': page([]),
    })
    renderApp('/people/p1')
    expect(await screen.findByRole('heading', { name: 'Rahim' })).toBeInTheDocument()
    expect(screen.getByText('They still owe you').nextSibling).toHaveTextContent('৳3,000')
    expect(screen.getByText('You still owe them').nextSibling).toHaveTextContent('৳1,000')
    expect(screen.getByText('Rahim owes you overall.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /give money/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /record repayment/i }).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Partially Paid')).length).toBeGreaterThan(0)
  })
})

describe('transactions', () => {
  const rows = [
    entry({ id: 'l1', transaction_id: 'l1', ref: 'LOAN0001', status: 'PARTIALLY_PAID', paid_total: '1000.00', outstanding: '4000.00' }),
    entry({ id: 'r1', transaction_id: 'l1', ref: 'REPAY001', entry_type: 'REPAYMENT_RECEIVED', amount: '1000.00', description: 'First part', status: 'PARTIALLY_PAID', outstanding: '4000.00', paid_total: '1000.00' }),
  ]

  it('renders loans and repayments with type, amount, status and reference', async () => {
    mockApi({ ...baseRoutes(), 'GET /people': page([person()]), 'GET /transactions': page(rows) })
    renderApp('/transactions')
    expect((await screen.findAllByText('LOAN0001')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Money Lent').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Repayment Received').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Partially Paid').length).toBeGreaterThan(0)
    expect(screen.getByText('1–2 of 2')).toBeInTheDocument()
  })

  it('sends filters to the server, and clears them', async () => {
    const api = mockApi({ ...baseRoutes(), 'GET /people': page([person()]), 'GET /transactions': page(rows) })
    renderApp('/transactions')
    await screen.findAllByText('LOAN0001')
    await userEvent.selectOptions(screen.getByLabelText('Transaction type'), 'REPAYMENT_RECEIVED')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'PARTIALLY_PAID')
    await userEvent.selectOptions(screen.getByLabelText('Person'), 'p1')
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'last_30_days')
    await waitFor(() => {
      const last = api.find('GET', '/transactions').at(-1)!
      expect(last.search.getAll('type')).toEqual(['REPAYMENT_RECEIVED'])
      expect(last.search.get('status')).toBe('PARTIALLY_PAID')
      expect(last.search.get('person_id')).toBe('p1')
      expect(last.search.get('range')).toBe('last_30_days')
    })
    await userEvent.click(screen.getByRole('button', { name: /clear 4 filters/i }))
    await waitFor(() => expect(api.find('GET', '/transactions').at(-1)!.search.get('status')).toBeNull())
  })

  it('searches with a debounce', async () => {
    const api = mockApi({ ...baseRoutes(), 'GET /people': page([]), 'GET /transactions': page(rows) })
    renderApp('/transactions')
    await screen.findAllByText('LOAN0001')
    await userEvent.type(screen.getByLabelText('Search transactions'), 'emergency')
    await waitFor(() => expect(api.find('GET', '/transactions').at(-1)!.search.get('search')).toBe('emergency'))
    // typing 9 characters must not fire 9 requests
    expect(api.find('GET', '/transactions').length).toBeLessThan(5)
  })

  it('supports sorting and pagination from the server', async () => {
    const api = mockApi({ ...baseRoutes(), 'GET /people': page([]), 'GET /transactions': page(rows, { total: 40, pages: 3, page_size: 15 }) })
    renderApp('/transactions')
    await screen.findAllByText('LOAN0001')
    await userEvent.click(screen.getByRole('button', { name: /^Amount/ }))
    await waitFor(() => expect(api.find('GET', '/transactions').at(-1)!.search.get('sort')).toBe('amount'))
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(api.find('GET', '/transactions').at(-1)!.search.get('page')).toBe('2'))
  })

  it('distinguishes "no data" from "no matches"', async () => {
    mockApi({ ...baseRoutes(), 'GET /people': page([]), 'GET /transactions': page([]) })
    const { unmount } = renderApp('/transactions')
    expect(await screen.findByText('No transactions yet')).toBeInTheDocument()
    unmount()
    mockApi({ ...baseRoutes(), 'GET /people': page([]), 'GET /transactions': page([]) })
    renderApp('/transactions?status=FULLY_PAID')
    expect(await screen.findByText('No matches')).toBeInTheDocument()
  })

  it('shows an error state with retry', async () => {
    let fail = true
    mockApi({ ...baseRoutes(), 'GET /people': page([]), 'GET /transactions': () => fail ? { status: 500, body: { detail: 'Something went wrong on our side.' } } : { body: page(rows) } })
    renderApp('/transactions')
    expect(await screen.findByText('Something went wrong on our side.')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect((await screen.findAllByText('LOAN0001')).length).toBeGreaterThan(0)
  })

  it('Money Given only requests lent loans', async () => {
    const api = mockApi({ ...baseRoutes(), 'GET /people': page([]), 'GET /transactions': page(rows), ...dashRoutes() })
    renderApp('/money-given')
    await screen.findAllByText('LOAN0001')
    expect(api.find('GET', '/transactions').at(-1)!.search.getAll('type')).toEqual(['LENT'])
    expect(screen.queryByLabelText('Transaction type')).not.toBeInTheDocument()
  })
})

describe('recording repayments', () => {
  const open = entry({ id: 'l1', transaction_id: 'l1', status: 'PARTIALLY_PAID', paid_total: '1000.00', outstanding: '4000.00', entry_date: '2026-11-01' })

  async function openDialog(extra: Record<string, unknown> = {}) {
    const api = mockApi({
      ...baseRoutes(), ...dashRoutes(), 'GET /transactions': page([open]),
      'POST /repayments': ({ body }: { body: { amount: string } }) => ({ status: 201, body: { id: 'r9', person_name: 'Rahim', transaction_status: body.amount === '4000.00' ? 'FULLY_PAID' : 'PARTIALLY_PAID' } }),
      ...extra,
    } as never)
    renderApp('/')
    await screen.findByRole('heading', { name: 'Hello, Tanvir' })
    await userEvent.click(screen.getAllByRole('button', { name: /record repayment/i })[0]!)
    const dlg = await screen.findByRole('dialog')
    await within(dlg).findByRole('option', { name: /Rahim/ })
    await userEvent.selectOptions(within(dlg).getByLabelText(/Which transaction/), 'l1')
    return { api, dlg }
  }

  it('shows original, repaid and remaining amounts for the chosen transaction', async () => {
    const { dlg } = await openDialog()
    expect(within(dlg).getByText('Original amount').nextSibling).toHaveTextContent('৳5,000')
    expect(within(dlg).getByText('Already repaid').nextSibling).toHaveTextContent('৳1,000')
    expect(within(dlg).getByText('Remaining').nextSibling).toHaveTextContent('৳4,000')
  })

  it('blocks overpayment, zero and malformed amounts without calling the API', async () => {
    const { api, dlg } = await openDialog()
    const amount = within(dlg).getByLabelText(/Amount received/)
    const submit = within(dlg).getByRole('button', { name: 'Record repayment' })

    await userEvent.type(amount, '4000.01')
    expect(await within(dlg).findByText('This is more than the remaining balance')).toBeInTheDocument()
    expect(submit).toBeDisabled()

    await userEvent.clear(amount); await userEvent.type(amount, '0')
    await userEvent.click(submit)
    expect(await within(dlg).findByText('Amount must be greater than zero')).toBeInTheDocument()

    await userEvent.clear(amount); await userEvent.type(amount, '12.345')
    await userEvent.click(submit)
    expect(await within(dlg).findByText(/up to 2 decimals/i)).toBeInTheDocument()
    expect(api.find('POST', '/repayments')).toHaveLength(0)
  })

  it('submits a valid partial repayment with an idempotency key and shows success', async () => {
    const { api, dlg } = await openDialog()
    await userEvent.type(within(dlg).getByLabelText(/Amount received/), '1500')
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record repayment' }))
    expect(await screen.findByText('Repayment recorded')).toBeInTheDocument()
    const sent = api.find('POST', '/repayments')
    expect(sent).toHaveLength(1)
    expect(sent[0]!.body).toMatchObject({ transaction_id: 'l1', person_id: 'p1', amount: '1500' })
    expect(sent[0]!.body).not.toHaveProperty('outstanding') // the client never submits balances
  })

  it('"pay full remaining" fills the exact balance and announces full payment', async () => {
    const { dlg } = await openDialog()
    await userEvent.click(within(dlg).getByRole('button', { name: /pay the full remaining balance/i }))
    expect(within(dlg).getByLabelText(/Amount received/)).toHaveValue('4000.00')
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record repayment' }))
    expect(await screen.findByText(/Fully paid/)).toBeInTheDocument()
  })

  it('maps a server-side rejection onto the form', async () => {
    const { dlg } = await openDialog({ 'POST /repayments': () => ({ status: 422, body: { detail: 'Repayment of 100.00 exceeds the remaining balance of 50.00', code: 'validation_failed', errors: [{ field: 'amount', message: 'Repayment of 100.00 exceeds the remaining balance of 50.00' }] } }) })
    await userEvent.type(within(dlg).getByLabelText(/Amount received/), '100')
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record repayment' }))
    expect(await within(dlg).findByText(/exceeds the remaining balance of 50.00/)).toBeInTheDocument()
  })

  it('explains when nothing is outstanding', async () => {
    mockApi({ ...baseRoutes(), ...dashRoutes(), 'GET /transactions': page([]) })
    renderApp('/')
    await screen.findByRole('heading', { name: 'Hello, Tanvir' })
    await userEvent.click(screen.getAllByRole('button', { name: /record repayment/i })[0]!)
    expect(await screen.findByText(/nothing is outstanding right now/i)).toBeInTheDocument()
  })
})

describe('adding a transaction', () => {
  it('validates, then sends only the original facts (never balances or user ids)', async () => {
    const api = mockApi({
      ...baseRoutes(), ...dashRoutes(), 'GET /people': page([person()]),
      'POST /transactions': { status: 201, body: { id: 't1' } } as never,
    })
    renderApp('/')
    await screen.findByRole('heading', { name: 'Hello, Tanvir' })
    await userEvent.click(screen.getByRole('button', { name: 'Give money' }))
    const dlg = await screen.findByRole('dialog')
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record loan' }))
    expect(await within(dlg).findByText('Choose a person')).toBeInTheDocument()
    expect(within(dlg).getByText('Enter an amount')).toBeInTheDocument()

    await within(dlg).findByRole('option', { name: 'Rahim' })
    await userEvent.selectOptions(within(dlg).getByLabelText(/Who are you lending to/), 'p1')
    await userEvent.type(within(dlg).getByLabelText(/^Amount/), '5000')
    await userEvent.type(within(dlg).getByLabelText('Description'), 'Emergency')
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record loan' }))
    expect(await screen.findByText('Loan recorded')).toBeInTheDocument()
    const body = api.find('POST', '/transactions')[0]!.body
    expect(body).toMatchObject({ person_id: 'p1', transaction_type: 'LENT', amount: '5000', description: 'Emergency' })
    expect(Object.keys(body).sort()).toEqual(['amount', 'description', 'expected_date', 'person_id', 'transaction_date', 'transaction_type'])
  })

  it('rejects an expected date earlier than the transaction date', async () => {
    mockApi({ ...baseRoutes(), ...dashRoutes(), 'GET /people': page([person()]) })
    renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Receive money' }))
    const dlg = await screen.findByRole('dialog')
    await within(dlg).findByRole('option', { name: 'Rahim' })
    await userEvent.selectOptions(within(dlg).getByLabelText(/Who is lending to you/), 'p1')
    await userEvent.type(within(dlg).getByLabelText(/^Amount/), '100')
    await userEvent.clear(within(dlg).getByLabelText(/Date received/)); await userEvent.type(within(dlg).getByLabelText(/Date received/), '2026-11-10')
    const exp = within(dlg).getByLabelText(/Expected return date/)
    await userEvent.type(exp, '2026-11-01')
    await userEvent.click(within(dlg).getByRole('button', { name: 'Record borrowing' }))
    expect(await within(dlg).findByText('Expected date cannot be before the transaction date')).toBeInTheDocument()
  })
})

describe('session handling', () => {
  it('drops the session and returns to login when the API says 401', async () => {
    mockApi({ ...baseRoutes(), 'GET /people': () => ({ status: 401, body: { detail: 'Invalid or expired session' } }) })
    const { router } = renderApp('/people')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(localStorage.getItem('howlat.token')).toBeNull()
  })
})
