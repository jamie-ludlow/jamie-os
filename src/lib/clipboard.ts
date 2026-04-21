import { toast } from 'sonner';

export async function copyToClipboard(text: string, label?: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label || 'Copied to clipboard');
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    toast.error('Failed to copy');
    return false;
  }
}
