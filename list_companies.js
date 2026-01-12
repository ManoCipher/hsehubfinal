import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zczaicsmeazucvsihick.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjemFpY3NtZWF6dWN2c2loaWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzA1ODEsImV4cCI6MjA3ODcwNjU4MX0.kF4gELeabRcFkVGuFeA0gHjvm-in2O-eM36EGrJNM64";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

import fs from 'fs';

async function fetchCompanies() {
    const { data, error } = await supabase
        .from('companies')
        .select('id, name, is_blocked, subscription_status', { count: 'exact' });

    let output = '';
    if (error) {
        output = `Error fetching companies: ${JSON.stringify(error)}`;
    } else {
        output += '--- Active Companies ---\n';
        const active = data.filter(c => !c.is_blocked);
        if (active.length === 0) {
            output += 'No active companies found (or RLS restricted).\n';
        } else {
            active.forEach(c => output += `- ${c.name} [${c.subscription_status || 'unknown'}] (${c.id})\n`);
        }

        output += '\n--- Blocked/Inactive Companies ---\n';
        const blocked = data.filter(c => c.is_blocked);
        blocked.forEach(c => output += `- ${c.name} [BLOCKED] (${c.id})\n`);
    }

    fs.writeFileSync('companies_list.txt', output);
    console.log('Written to companies_list.txt');
}

fetchCompanies();
