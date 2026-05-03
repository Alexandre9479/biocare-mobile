export type UserRole = 'admin' | 'engineer'
export type AvailabilityStatus = 'available' | 'on_service' | 'on_leave' | 'unavailable'
export type SaleType = 'cash' | 'placement' | 'hire_purchase'
export type EquipmentStatus = 'active' | 'inactive' | 'decommissioned'
export type ServiceType = 'preventive' | 'corrective' | 'installation' | 'calibration' | 'emergency'
export type AssignmentStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  specializations: string[]
  availability_status: AvailabilityStatus
}

export interface Equipment {
  id: string
  serial_number: string
  facility_name: string
  facility_contact_name?: string
  facility_contact_phone?: string
  facility_address?: string
  sale_type: SaleType
  status: EquipmentStatus
  next_service_date?: string
  last_service_date?: string
  installation_date?: string
  hp_payment_status?: string
  subcategory?: { name: string }
  region?: { name: string }
}

export interface Assignment {
  id: string
  equipment_id: string
  engineer_id: string
  scheduled_date?: string
  service_type?: ServiceType
  status: AssignmentStatus
  priority: Priority
  special_instructions?: string
  equipment?: Equipment
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  data?: Record<string, unknown>
}
