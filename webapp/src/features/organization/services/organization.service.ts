import { apiClient } from '@/shared/api/api.client';

export interface ClinicMember {
  id: string;
  userId: string;
  role: 'CLINIC_ADMIN' | 'NUTRITIONIST' | 'CLINIC_MANAGER' | 'RECEPTIONIST';
  colorHex: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface ClinicDetails {
  id: string;
  name: string;
  slug?: string;
  maxSeats: number;
  verificationStatus?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  members: ClinicMember[];
}

export interface ClinicStats {
  totalPatients: number;
  totalConsultations: number;
  totalPlans: number;
  activeMembers: number;
  todayAppointments: number;
}

export interface PersonalClinicStats {
  myTodayAppointments: number;
  myPatients: number;
  myMenus: number;
  myAttendance: number;
}

export interface OrganizationAppointment {
  id: string;
  time: string;
  patientName: string;
  nutritionistName: string;
  nutritionistColor: string;
  status: string;
}

export const organizationService = {
  async getClinicDetails(orgId: string): Promise<ClinicDetails> {
    try {
      const res = await apiClient.get(`/api/organizations/${orgId}`);
      return res.data;
    } catch (err) {
      console.error('Error al obtener detalles de clínica:', err);
      return {
        id: orgId,
        name: 'Centro Santa María',
        maxSeats: 5,
        verificationStatus: 'VERIFIED',
        members: [],
      };
    }
  },

  async getClinicStats(orgId: string): Promise<ClinicStats> {
    try {
      const res = await apiClient.get(`/api/organizations/${orgId}/stats`);
      return res.data;
    } catch (err) {
      console.error('Error al obtener stats de clínica:', err);
      return {
        totalPatients: 0,
        totalConsultations: 0,
        totalPlans: 0,
        activeMembers: 0,
        todayAppointments: 0,
      };
    }
  },

  async getPersonalClinicStats(orgId: string): Promise<PersonalClinicStats> {
    try {
      const res = await apiClient.get(`/api/organizations/${orgId}/personal-stats`);
      return res.data;
    } catch (err) {
      console.error('Error al obtener stats personales de clínica:', err);
      return {
        myTodayAppointments: 0,
        myPatients: 0,
        myMenus: 0,
        myAttendance: 100,
      };
    }
  },

  async getClinicAppointments(orgId: string): Promise<OrganizationAppointment[]> {
    try {
      const res = await apiClient.get(`/api/organizations/${orgId}/appointments/today`);
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch (err) {
      console.error('Error al obtener citas de clínica:', err);
      return [];
    }
  },

  async purchaseSeats(orgId: string, additionalSeats: number): Promise<{ success: boolean; newMaxSeats: number }> {
    try {
      const res = await apiClient.post(`/api/organizations/${orgId}/seats/purchase`, { additionalSeats });
      return {
        success: true,
        newMaxSeats: res.data?.newMaxSeats || res.data?.maxSeats,
      };
    } catch (err) {
      console.error('Error purchasing seats:', err);
      throw err;
    }
  },

  async adminUpdateSeats(orgId: string, newMaxSeats: number): Promise<{ success: boolean; maxSeats: number }> {
    try {
      const res = await apiClient.patch(`/api/organizations/${orgId}/seats`, { maxSeats: newMaxSeats });
      return res.data;
    } catch (err) {
      console.error('Error updating seats:', err);
      throw err;
    }
  },

  async getClinicAgendaHistory(orgId: string, year?: number, month?: number) {
    try {
      const params = new URLSearchParams();
      if (year) params.append('year', String(year));
      if (month) params.append('month', String(month));

      const res = await apiClient.get(`/api/organizations/${orgId}/agenda/history?${params.toString()}`);
      return res.data;
    } catch (err) {
      console.warn('Endpoint /agenda/history fallback mode:', err);
      return null;
    }
  },

  async acceptInvitation(token: string): Promise<{ success: boolean; organization?: { name?: string } }> {
    try {
      const res = await apiClient.post('/api/organizations/accept-invite', { token });
      return { success: true, organization: res.data };
    } catch (err) {
      console.error('Error accepting invitation:', err);
      return { success: false };
    }
  },

  async rejectInvitation(token: string): Promise<{ success: boolean }> {
    try {
      await apiClient.post('/api/organizations/reject-invite', { token });
      return { success: true };
    } catch (err) {
      console.error('Error rejecting invitation:', err);
      return { success: false };
    }
  },
};

