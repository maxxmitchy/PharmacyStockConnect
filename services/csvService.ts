import { Pharmacy, MessageStatus, ResponseStatus } from '../types';

export const parseCSV = async (file: File): Promise<Pharmacy[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        resolve([]);
        return;
      }

      const lines = text.split('\n');
      const pharmacies: Pharmacy[] = [];

      // Detect if first line is header
      const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSV Format: Name,Address,Phone Number,Google Map Link
        // We use a simple split by comma. 
        // If addresses contain commas without quotes, this might be tricky, 
        // but we'll use a strategy assuming the Phone is the 2nd to last item and Link is last.
        
        const parts = line.split(',');
        
        if (parts.length < 3) continue;

        // Strategy: 
        // Name = parts[0]
        // Link = last part
        // Phone = 2nd to last part
        // Address = everything in between
        
        const name = parts[0].trim().replace(/^"|"$/g, ''); // Remove quotes if present
        const link = parts[parts.length - 1].trim();
        const phone = parts[parts.length - 2].trim();
        
        // Reconstruct address if it was split by commas
        const addressParts = parts.slice(1, parts.length - 2);
        const address = addressParts.join(', ').trim().replace(/^"|"$/g, '');

        if (name && phone) {
          pharmacies.push({
            id: crypto.randomUUID(),
            name,
            phone,
            status: MessageStatus.IDLE,
            responseStatus: ResponseStatus.UNKNOWN,
            message: '', 
            notes: address ? `Address: ${address}` : '',
            lastUpdated: Date.now()
          });
        }
      }
      resolve(pharmacies);
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

export const exportToCSV = (pharmacies: Pharmacy[]) => {
  const headers = ['Name', 'Phone', 'Status', 'Response Status', 'Message', 'Notes', 'Last Updated'];
  
  const rows = pharmacies.map(p => {
    // Escape quotes for CSV format
    const safeName = `"${p.name.replace(/"/g, '""')}"`;
    const safePhone = `"${p.phone.replace(/"/g, '""')}"`;
    const safeMessage = `"${(p.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    const safeNotes = `"${(p.notes || '').replace(/"/g, '""')}"`;
    const date = new Date(p.lastUpdated).toLocaleDateString();

    return [
      safeName,
      safePhone,
      p.status,
      p.responseStatus,
      safeMessage,
      safeNotes,
      date
    ].join(',');
  });

  const csvContent = [
    headers.join(','),
    ...rows
  ].join('\n');

  return csvContent;
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};