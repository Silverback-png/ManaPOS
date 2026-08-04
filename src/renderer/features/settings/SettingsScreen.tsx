import { FormEvent, useEffect, useState } from 'react';
import type { AppSettings } from '@shared/types/domain';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

/**
 * Settings screen — edits every application setting in one form.
 * The main process validates authoritatively; this screen only mirrors
 * the basics (required fields, PIN pattern) for fast feedback.
 */
export default function SettingsScreen(): JSX.Element {
  const [saved, setSaved] = useState<AppSettings | null>(null);
  const [form, setForm] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavedTick, setShowSavedTick] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.settings
      .get()
      .then((settings) => {
        if (cancelled) return;
        setSaved(settings);
        setForm(settings);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty =
    saved !== null && form !== null && JSON.stringify(saved) !== JSON.stringify(form);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setShowSavedTick(false);
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!form || saving) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await api.settings.update(form);
      setSaved(updated);
      setForm(updated);
      setShowSavedTick(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 p-6">
        <p className="text-sm text-muted">Loading settings…</p>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="flex-1 p-6">
        <p className="text-sm text-danger">{error ?? 'Settings could not be loaded.'}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto max-w-3xl space-y-6">
        {error && (
          <div className="rounded-lg border border-danger bg-danger-muted px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Card title="Business details" description="Shown on receipts and reports.">
          <div className="space-y-4">
            <Input
              label="Business name"
              value={form.businessName}
              onChange={(e) => update('businessName', e.target.value)}
              required
              maxLength={100}
            />
            <Input
              label="Business address"
              value={form.businessAddress}
              onChange={(e) => update('businessAddress', e.target.value)}
              maxLength={200}
            />
            <Input
              label="Phone number"
              value={form.phoneNumber}
              onChange={(e) => update('phoneNumber', e.target.value)}
              maxLength={30}
            />
          </div>
        </Card>

        <Card
          title="Receipt & tax"
          description="Selling prices include VAT; the VAT portion is extracted on receipts."
        >
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="VAT %"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={form.vatRatePercent}
              onChange={(e) =>
                update(
                  'vatRatePercent',
                  Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0
                )
              }
              required
            />
            <Input
              label="Currency symbol"
              value={form.currencySymbol}
              onChange={(e) => update('currencySymbol', e.target.value)}
              required
              maxLength={3}
            />
          </div>
          <div className="mt-4">
            <Input
              label="Receipt footer"
              value={form.receiptFooter}
              onChange={(e) => update('receiptFooter', e.target.value)}
              maxLength={200}
              hint="Printed at the bottom of every receipt."
            />
          </div>
        </Card>

        <Card title="Security" description="The manager PIN authorises every void.">
          <Input
            label="Manager PIN"
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            autoComplete="off"
            value={form.managerPin}
            onChange={(e) => update('managerPin', e.target.value)}
            required
            hint="Exactly 4 digits. Default is 1234 — change it before going live."
          />
        </Card>

        <div className="flex items-center justify-end gap-4 pb-6">
          {showSavedTick && !isDirty && (
            <span className="text-sm font-medium text-accent">Settings saved ✓</span>
          )}
          <Button type="submit" size="lg" disabled={!isDirty || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </main>
  );
}
