# Loggable Activities in HSE Hub

This document lists all system activities that are automatically logged in the Company Activity Logs. These logs provide an audit trail for security, compliance, and operational visibility.

## 1. Authentication & Access
| Activity | Action Key | Description |
| :--- | :--- | :--- |
| **User Login** | `login` | Logged whenever a user successfully logs into the platform. Includes IP address if available. |

## 2. Employee Management
| Activity | Action Key | Description |
| :--- | :--- | :--- |
| **Create Employee** | `create_employee` | Logged when a new employee profile is added. |
| **Update Employee** | `update_employee` | Logged when an employee's details are modified. |
| **Delete User** | `delete_user` | Logged when a user account is permanently deleted from the system. |
| **Add Note** | `add_employee_note` | Logged when a note is added to an employee's profile. |
| **Delete Note** | `delete_employee_note` | Logged when a note is removed. |

## 3. Incident Management
| Activity | Action Key | Description |
| :--- | :--- | :--- |
| **Report Incident** | `create_incident` | Logged when a new safety incident is reported. Includes severity and type. |
| **Update Incident** | `update_incident` | Logged when incident details or status are updated. |
| **Delete Incident** | `delete_incident` | Logged when an incident record is deleted. |

## 4. Task Management
| Activity | Action Key | Description |
| :--- | :--- | :--- |
| **Assign Task** | `assign_task` | Logged when a new task is assigned to an employee. |
| **Complete Task** | `complete_task` | Logged when a task is marked as completed. |
| **Reopen Task** | `reopen_task` | Logged when a completed task is reopened. |

## 5. Reports & Compliance
| Activity | Action Key | Description |
| :--- | :--- | :--- |
| **Update Custom Reports** | `update_custom_reports` | Logged when custom report configurations are saved. |
| **Activate ISO Standard** | `activate_iso_standard` | Logged when a compliance standard (e.g., ISO 45001) is enabled. |
| **Deactivate ISO Standard** | `deactivate_iso_standard` | Logged when a compliance standard is disabled. |

## 6. Company Administration (Super Admin)
| Activity | Action Key | Description |
| :--- | :--- | :--- |
| **Block Company** | `block_company` | Logged when a company's access is suspended. |
| **Unblock Company** | `unblock_company` | Logged when a company's access is restored. |
| **Invoice Correction** | `invoice_correction` | Logged when a billing adjustment is made. |
| **Assign Add-on** | `assign_addon` | Logged when a new module or add-on is provisioned for the company. |

---
*Generated for HSE Hub Audit & Compliance Standards*
