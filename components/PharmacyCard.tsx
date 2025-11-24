import React, { useState } from 'react';
import { Pharmacy, MessageStatus, ResponseStatus } from '../types';
import { 
  MessageSquare, 
  Send, 
  Check, 
  Loader2, 
  Edit2, 
  Trash2, 
  RefreshCw,
  Phone,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Clock
} from 'lucide-react';

interface PharmacyCardProps {
  pharmacy: Pharmacy;
  onDelete: (id: string) => void;
  onUpdateMessage: (id: string, newMessage: string) => void;
  onRegenerateSingle: (id: string) => void;
  onStatusChange: (id: string, status: MessageStatus) => void;
  onResponseChange: (id: string, response: ResponseStatus) => void;
}

const PharmacyCard: React.FC<PharmacyCardProps> = ({ 
  pharmacy, 
  onDelete, 
  onUpdateMessage,
  onRegenerateSingle,
  onStatusChange,
  onResponseChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(pharmacy.message);

  const handleManualSend = () => {
    const cleanNumber = pharmacy.phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(pharmacy.message)}`;
    window.open(url, '_blank');
    onStatusChange(pharmacy.id, MessageStatus.SENT);
    onResponseChange(pharmacy.id, ResponseStatus.PENDING);
  };

  const handleSaveEdit = () => {
    onUpdateMessage(pharmacy.id, editedMessage);
    setIsEditing(false);
  };

  const getResponseBadge = () => {
    switch (pharmacy.responseStatus) {
      case ResponseStatus.AVAILABLE:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><ThumbsUp size={10} className="mr-1"/> Available</span>;
      case ResponseStatus.UNAVAILABLE:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><ThumbsDown size={10} className="mr-1"/> No Stock</span>;
      case ResponseStatus.PENDING:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200"><Clock size={10} className="mr-1"/> Pending</span>;
      case ResponseStatus.NO_REPLY:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"><HelpCircle size={10} className="mr-1"/> No Reply</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`group relative bg-white rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md
      ${pharmacy.responseStatus === ResponseStatus.AVAILABLE ? 'border-green-300 ring-1 ring-green-100' : 'border-gray-200'}
    `}>
      <div className="p-4 sm:p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-lg">{pharmacy.name}</h3>
              {getResponseBadge()}
            </div>
            <div className="flex items-center text-sm text-gray-500 font-mono gap-2">
               <Phone size={12} /> {pharmacy.phone}
            </div>
          </div>
          
          <button 
            onClick={() => onDelete(pharmacy.id)}
            className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
            title="Remove from database"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Message Area */}
        <div className="bg-gray-50 rounded-lg p-3 relative group-hover:bg-blue-50/20 transition-colors border border-gray-100">
            <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare size={12} />
                    Message
                 </span>
                 <div className="flex gap-1">
                     {!isEditing && (
                         <>
                            <button 
                                onClick={() => onRegenerateSingle(pharmacy.id)}
                                disabled={pharmacy.status === MessageStatus.GENERATING}
                                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50"
                                title="Regenerate with AI"
                            >
                                {pharmacy.status === MessageStatus.GENERATING ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12} />}
                            </button>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                            >
                                <Edit2 size={12} />
                            </button>
                         </>
                     )}
                 </div>
            </div>

            {isEditing ? (
                <div className="space-y-2">
                    <textarea 
                        value={editedMessage}
                        onChange={(e) => setEditedMessage(e.target.value)}
                        className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        rows={3}
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                        <button onClick={handleSaveEdit} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Save</button>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {pharmacy.status === MessageStatus.GENERATING ? (
                        <span className="flex items-center gap-2 text-blue-500">
                            <Loader2 size={14} className="animate-spin" /> Generating...
                        </span>
                    ) : (
                        pharmacy.message || <span className="text-gray-400 italic">No message generated yet.</span>
                    )}
                </p>
            )}
        </div>

        {/* Action Footer */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            
            {/* Response Tracker (Database Update) */}
            <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 mr-1">Mark Reply:</span>
                <button 
                    onClick={() => onResponseChange(pharmacy.id, ResponseStatus.AVAILABLE)}
                    className={`p-1.5 rounded-md transition-colors ${pharmacy.responseStatus === ResponseStatus.AVAILABLE ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100 text-gray-400'}`}
                    title="Available"
                >
                    <ThumbsUp size={16} />
                </button>
                <button 
                     onClick={() => onResponseChange(pharmacy.id, ResponseStatus.UNAVAILABLE)}
                     className={`p-1.5 rounded-md transition-colors ${pharmacy.responseStatus === ResponseStatus.UNAVAILABLE ? 'bg-red-100 text-red-700' : 'hover:bg-gray-100 text-gray-400'}`}
                     title="Unavailable"
                >
                    <ThumbsDown size={16} />
                </button>
                <button 
                     onClick={() => onResponseChange(pharmacy.id, ResponseStatus.NO_REPLY)}
                     className={`p-1.5 rounded-md transition-colors ${pharmacy.responseStatus === ResponseStatus.NO_REPLY ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-100 text-gray-400'}`}
                     title="No Reply"
                >
                    <HelpCircle size={16} />
                </button>
            </div>

            {/* Send Button */}
            <button
                onClick={handleManualSend}
                disabled={!pharmacy.message || pharmacy.status === MessageStatus.GENERATING}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${pharmacy.status === MessageStatus.SENT 
                        ? 'text-gray-400 hover:bg-gray-100' 
                        : 'text-green-600 hover:bg-green-50'
                    }
                `}
            >
                {pharmacy.status === MessageStatus.SENT ? "Sent (Open Again)" : "Manual Send"} <Send size={12} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default PharmacyCard;