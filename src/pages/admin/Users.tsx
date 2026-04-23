import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { User, Mail, Phone, Calendar, Download, Search, UserCheck, Shield, ChevronRight, Printer, FileText, UserPlus, ShieldAlert, CheckCircle2, FileType, ExternalLink } from 'lucide-react';
import { UserProfile } from '../../types';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setUsers(usersData);
      
      // Update selected user info if they were updated in real-time
      if (selectedUser) {
        const updated = usersData.find(u => u.uid === selectedUser.uid);
        if (updated) setSelectedUser(updated);
      }
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedUser?.uid]);

  const toggleAdminRole = async (targetUser: UserProfile) => {
    if (!window.confirm(`Are you sure you want to change ${targetUser.name}'s role to ${targetUser.role === 'admin' ? 'Investor' : 'Admin'}?`)) {
      return;
    }

    setUpdating(targetUser.uid);
    setActionMessage(null);
    try {
      const newRole = targetUser.role === 'admin' ? 'investor' : 'admin';
      await updateDoc(doc(db, 'users', targetUser.uid), {
        role: newRole
      });
      setActionMessage({ type: 'success', text: `User role updated to ${newRole} successfully.` });
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: 'Failed to update user role.' });
    } finally {
      setUpdating(null);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = user.name?.toLowerCase().includes(searchLower) || false;
    const emailMatch = user.email?.toLowerCase().includes(searchLower) || false;
    const phoneMatch = user.phone?.includes(searchTerm) || false;
    return nameMatch || emailMatch || phoneMatch;
  });

  const handlePrint = (user: UserProfile) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const profile = user.investorProfile;
    const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Investor Profile - ${user.name || 'Anonymous'}</title>
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; padding: 40px; }
            h1 { color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px; margin-bottom: 30px; }
            h2 { color: #4b5563; font-size: 18px; margin-top: 30px; border-left: 4px solid #16a34a; padding-left: 10px; }
            .section { margin-bottom: 20px; display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
            .item { margin-bottom: 10px; }
            .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .value { font-size: 14px; font-weight: 500; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>We Farm - Investor Information Sheet</h1>
          
          <div class="section">
            <div class="item"><div class="label">Full Name</div><div class="value">${user.name || 'N/A'}</div></div>
            <div class="item"><div class="label">Email</div><div class="value">${user.email || 'N/A'}</div></div>
            <div class="item"><div class="label">Phone</div><div class="value">${user.phone || 'N/A'}</div></div>
            <div class="item"><div class="label">Role</div><div class="value">${user.role || 'investor'}</div></div>
            <div class="item"><div class="label">Joined Date</div><div class="value">${joinDate}</div></div>
          </div>

          <h2>1. Personal Details</h2>
          <div class="section">
            <div class="item"><div class="label">Father's Name</div><div class="value">${profile?.fatherName || 'N/A'}</div></div>
            <div class="item"><div class="label">Mother's Name</div><div class="value">${profile?.motherName || 'N/A'}</div></div>
            <div class="item"><div class="label">Date of Birth</div><div class="value">${profile?.dob || 'N/A'}</div></div>
            <div class="item"><div class="label">Gender</div><div class="value">${profile?.gender || 'N/A'}</div></div>
            <div class="item"><div class="label">NID/Passport</div><div class="value">${profile?.nidPassport || 'N/A'}</div></div>
          </div>

          <h2>2. Contact Information</h2>
          <div class="section">
            <div class="item"><div class="label">Current Address</div><div class="value">${profile?.currentAddress || 'N/A'}</div></div>
            <div class="item"><div class="label">Permanent Address</div><div class="value">${profile?.permanentAddress || 'N/A'}</div></div>
          </div>

          <h2>3. Occupational Details</h2>
          <div class="section">
            <div class="item"><div class="label">Occupation</div><div class="value">${profile?.occupation || 'N/A'}</div></div>
            <div class="item"><div class="label">Organization</div><div class="value">${profile?.organization || 'N/A'}</div></div>
            <div class="item"><div class="label">Designation</div><div class="value">${profile?.designation || 'N/A'}</div></div>
          </div>

          <h2>4. Bank Details</h2>
          <div class="section">
            <div class="item"><div class="label">Bank Name</div><div class="value">${profile?.bankName || 'N/A'}</div></div>
            <div class="item"><div class="label">Branch</div><div class="value">${profile?.branchName || 'N/A'}</div></div>
            <div class="item"><div class="label">Account Name</div><div class="value">${profile?.accountName || 'N/A'}</div></div>
            <div class="item"><div class="label">Account Number</div><div class="value">${profile?.accountNumber || 'N/A'}</div></div>
            <div class="item"><div class="label">Routing Number</div><div class="value">${profile?.routingNumber || 'N/A'}</div></div>
          </div>

          <h2>5. Nominee Details</h2>
          <div class="section">
            <div class="item"><div class="label">Nominee Name</div><div class="value">${profile?.nomineeName || 'N/A'}</div></div>
            <div class="item"><div class="label">Relation</div><div class="value">${profile?.nomineeRelation || 'N/A'}</div></div>
            <div class="item"><div class="label">Phone</div><div class="value">${profile?.nomineePhone || 'N/A'}</div></div>
            <div class="item"><div class="label">NID</div><div class="value">${profile?.nomineeNid || 'N/A'}</div></div>
          </div>

          <h2>6. Attachments Provided</h2>
          <div class="section">
            <div class="item"><div class="label">Investor NID Card</div><div class="value">${profile?.nidFileUrl ? 'YES (Digital Copy Available)' : 'NO'}</div></div>
            <div class="item"><div class="label">Nominee NID Card</div><div class="value">${profile?.nomineeNidFileUrl ? 'YES (Digital Copy Available)' : 'NO'}</div></div>
          </div>

          <p style="margin-top: 50px; font-size: 10px; color: #999;">Printed on: ${new Date().toLocaleString()}</p>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">View and manage all registered users and investors.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white border border-gray-100 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 shadow-sm">
            Total Users: {users.length}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* User List */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr 
                      key={user.uid || `user-${index}`} 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedUser?.uid === user.uid ? 'bg-green-50' : ''}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center font-bold text-green-700">
                            {(user.name || 'A').charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{user.name || 'Anonymous'}</span>
                            <span className="text-[10px] text-gray-400">{(user.uid || 'unknown').substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                              <Phone className="h-3 w-3" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(user);
                          }}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="Print Details"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Details / Preview */}
        <div className="xl:col-span-1 space-y-6">
          {selectedUser ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 sticky top-6">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                  {(selectedUser.name || 'A').charAt(0)}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name || 'Anonymous'}</h2>
                <span className="text-sm text-gray-400 uppercase font-bold tracking-widest">{selectedUser.role}</span>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Core Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Email</span>
                      <span className="font-bold text-gray-900">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-bold text-gray-900">{selectedUser.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Investor Profile</h3>
                  {selectedUser.investorProfile ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Occupation</span>
                        <span className="font-bold text-gray-900">{selectedUser.investorProfile.occupation || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">NID/Passport</span>
                        <span className="font-bold text-gray-900">{selectedUser.investorProfile.nidPassport || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Bank</span>
                        <span className="font-bold text-gray-900">{selectedUser.investorProfile.bankName || 'N/A'}</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl mt-4">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Current Address</p>
                        <p className="text-xs text-gray-600 line-clamp-2">{selectedUser.investorProfile.currentAddress || 'N/A'}</p>
                      </div>

                      <div className="pt-4 space-y-3">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attachments</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedUser.investorProfile.nidFileUrl ? (
                            <a 
                              href={selectedUser.investorProfile.nidFileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 p-2 bg-green-50 text-green-700 rounded-lg border border-green-100 hover:bg-green-100 transition-all text-[10px] font-bold"
                            >
                              <FileType className="h-3 w-3" />
                              <span>Investor NID</span>
                            </a>
                          ) : (
                            <div className="flex items-center space-x-2 p-2 bg-gray-50 text-gray-400 rounded-lg border border-gray-100 text-[10px] font-bold">
                              <FileType className="h-3 w-3 opacity-30" />
                              <span>No Investor NID</span>
                            </div>
                          )}

                          {selectedUser.investorProfile.nomineeNidFileUrl ? (
                            <a 
                              href={selectedUser.investorProfile.nomineeNidFileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all text-[10px] font-bold"
                            >
                              <FileType className="h-3 w-3" />
                              <span>Nominee NID</span>
                            </a>
                          ) : (
                            <div className="flex items-center space-x-2 p-2 bg-gray-50 text-gray-400 rounded-lg border border-gray-100 text-[10px] font-bold">
                              <FileType className="h-3 w-3 opacity-30" />
                              <span>No Nominee NID</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 p-4 rounded-2xl flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-amber-500" />
                      <p className="text-xs text-amber-600 font-medium">Investor profile not yet completed.</p>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Role Management</h3>
                  {actionMessage && (
                    <div className={`p-3 rounded-xl mb-3 text-xs font-bold flex items-center space-x-2 ${
                      actionMessage.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {actionMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                      <span>{actionMessage.text}</span>
                    </div>
                  )}
                  <button 
                    onClick={() => toggleAdminRole(selectedUser)}
                    disabled={!!updating}
                    className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-bold transition-all border ${
                      selectedUser.role === 'admin' 
                        ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' 
                        : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                    }`}
                  >
                    {updating === selectedUser.uid ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <>
                        {selectedUser.role === 'admin' ? (
                          <>
                            <ShieldAlert className="h-4 w-4" />
                            <span>Demote to Investor</span>
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4" />
                            <span>Promote to Admin</span>
                          </>
                        )}
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-[10px] text-gray-400 text-center">
                    Admins have full access to management features.
                  </p>
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-3">
                  <button 
                    onClick={() => handlePrint(selectedUser)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print All</span>
                  </button>
                  <button 
                    className="flex-1 flex items-center justify-center space-x-2 bg-gray-50 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all border border-gray-200"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Full Log</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
              <User className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Select a user to view detailed information and print their profile sheet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
