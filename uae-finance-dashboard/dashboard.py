import streamlit as st
import pandas as pd
import database as db
import requests
from datetime import datetime

# Page Config
# Page Config
st.set_page_config(page_title="UAE Finance Control Tower", page_icon="🇦🇪", layout="wide")

# Custom CSS for aesthetics
st.markdown("""
    <style>
    .metric-card {
        background-color: #1E1E1E;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    .stProgress > div > div > div > div {
        background-color: #00FF00;
    }
    /* Tabs */
    .stTabs [data-baseweb="tab-list"] {
        gap: 24px;
    }
    .stTabs [data-baseweb="tab"] {
        height: 50px;
        white-space: pre-wrap;
        background-color: transparent;
        border-radius: 4px 4px 0px 0px;
        gap: 1px;
        padding-top: 10px;
        padding-bottom: 10px;
    }
    </style>
    """, unsafe_allow_html=True)

# Sidebar - Configuration
st.sidebar.header("⚙️ Configuration")

# Telegram Sync Button
if st.sidebar.button("🔄 Sync Telegram"):
    import telegram_sync
    with st.sidebar.status("Syncing with Telegram..."):
        logs = telegram_sync.fetch_and_process_updates()
        st.session_state['sync_logs'] = logs
        st.rerun()

if 'sync_logs' in st.session_state:
    st.sidebar.markdown("### Latest Sync:")
    for log in st.session_state['sync_logs']:
        if "✅" in log:
            st.sidebar.success(log)
        elif "💰" in log:
            st.sidebar.success(log)
        else:
            st.sidebar.warning(log)
    if st.sidebar.button("Clear Logs"):
        del st.session_state['sync_logs']
        st.rerun()

monthly_salary = st.sidebar.number_input("Monthly Base Salary (AED)", value=40000.0, step=1000.0)
fixed_costs = st.sidebar.number_input("Fixed Costs (AED)", value=20000.0, step=500.0)

st.sidebar.markdown("### 🎯 Allocations")
emergency_fund_pct = st.sidebar.slider("Emergency Fund (%)", 0, 20, 5)
savings_pct = st.sidebar.slider("Savings Allocation (%)", 0, 50, 20)
gold_fixed_amt = st.sidebar.number_input("Gold (Fixed AED/mo)", value=1000.0, step=100.0)

# Calculate automated savings & allocations
emergency_fund_contribution = monthly_salary * (emergency_fund_pct / 100)
savings_contribution = monthly_salary * (savings_pct / 100)
allocations_total = emergency_fund_contribution + savings_contribution + gold_fixed_amt

safe_to_spend_cap = monthly_salary - fixed_costs - allocations_total

# Initialize Session State for Settings
if 'initial_war_chest' not in st.session_state:
    st.session_state['initial_war_chest'] = 0.0
if 'assets_manual' not in st.session_state:
    st.session_state['assets_manual'] = 0.0
if 'assets_real_estate' not in st.session_state:
    st.session_state['assets_real_estate'] = 0.0
if 'liabilities' not in st.session_state:
    st.session_state['liabilities'] = 0.0
if 'mortgage_balance' not in st.session_state:
    st.session_state['mortgage_balance'] = 0.0

# Fetch Data
try:
    df_txns = db.get_transactions()
    current_month = datetime.now().strftime("%Y-%m")
    
    # Always convert date column to datetime to prevent .dt accessor errors later
    if not df_txns.empty:
        df_txns['date'] = pd.to_datetime(df_txns['date'])
    else:
        # Ensure schema structure even if empty
        if 'date' in df_txns.columns:
            df_txns['date'] = pd.to_datetime(df_txns['date'])

    if not df_txns.empty:
        current_month_txns = df_txns[
            (df_txns['date'].dt.strftime('%Y-%m') == current_month) & 
            (df_txns['type'] == 'Expense') & 
            (df_txns['category'] != 'Fixed Cost')
        ]
        spent_this_month = current_month_txns['amount'].sum()
    else:
        spent_this_month = 0.0
except Exception as e:
    st.error(f"Database Error: {e}")
    df_txns = pd.DataFrame()
    spent_this_month = 0.0

# === TABS ===
tab1, tab2, tab3, tab4 = st.tabs(["🚀 Control Tower", "📊 Analytics", "⚙️ Settings & Net Worth", "📝 Data"])

# --- TAB 1: CONTROL TOWER ---
with tab1:
    st.subheader("Your Financial Pulse")
    col1, col2, col3 = st.columns(3)

    # 1. Safe-to-Spend Pulse
    remaining_safe_to_spend = safe_to_spend_cap - spent_this_month
    pct_left = (remaining_safe_to_spend / safe_to_spend_cap * 100) if safe_to_spend_cap > 0 else 0
    
    # Dynamic Color Logic
    if pct_left > 50:
        pulse_color = "normal" 
        bar_color = "#00FF00"
        msg = "✅ Safe Zone"
    elif pct_left > 25:
        pulse_color = "off"
        bar_color = "#FFA500"
        msg = "⚠️ Caution"
    else:
        pulse_color = "inverse"
        bar_color = "#FF0000"
        msg = "🚨 Critical"

    with col1:
        st.markdown(f"### Safe-to-Spend Pulse")
        st.metric(label="Available Liquidity", value=f"AED {remaining_safe_to_spend:,.2f}", delta=f"{pct_left:.1f}% left", delta_color=pulse_color)
        
        st.markdown(f"""
        <style>
        .stProgress > div > div > div > div {{
            background-color: {bar_color};
        }}
        </style>""", unsafe_allow_html=True)
        
        progress = max(0.0, min(1.0, spent_this_month / safe_to_spend_cap)) if safe_to_spend_cap > 0 else 0
        st.progress(progress)
        st.caption(msg)
        st.info(f"Budget Formula:\nSalary ({monthly_salary:,.0f}) - Fixed ({fixed_costs:,.0f}) - Allocations ({allocations_total:,.0f})")

    # 2. Savings (Formerly Real Estate War Chest)
    try:
        if not df_txns.empty:
            bonuses = df_txns[df_txns['tag'].str.contains('#bonus', na=False) & (df_txns['type'] == 'Income')]
            total_bonus_saved = bonuses['amount'].sum() * 0.90
        else:
            total_bonus_saved = 0.0
    except:
        total_bonus_saved = 0.0

    total_savings_fund = total_bonus_saved + savings_contribution + st.session_state['initial_war_chest']
    target_downpayment = 400000.0

    with col2:
        st.markdown("### 🏦 Savings")
        st.metric(label="Current Fund", value=f"AED {total_savings_fund:,.2f}", delta=f"Target: {target_downpayment:,.0f}")
        
        re_progress = max(0.0, min(1.0, total_savings_fund / target_downpayment))
        st.progress(re_progress)
        st.caption(f"{(total_savings_fund/target_downpayment)*100:.1f}% to Downpayment")

    # 3. Allocations & Confirmations
    with col3:
        st.markdown("### 🛡️ Allocations")
        
        current_date = datetime.now()
        # Allow checking previous month if near start of new month? 
        # For now, simplistic "Select Month to Confirm"
        c_year = datetime.now().year
        c_month = datetime.now().month
        
        # Month Selector (Default to current, but allow December 2025 backdate)
        # Fix: Show last 3 months + next month
        date_options = []
        for i in range(-2, 2):
            d = current_date + pd.DateOffset(months=i)
            date_options.append(d.strftime("%Y-%m"))
            
        selected_month_str = st.selectbox("Period", date_options, index=2) # Default to current (index 2)
        
        # Check status for SELECTED month
        ef_done = not df_txns[
            (df_txns['description'] == "Monthly Emergency Fund") & 
            (df_txns['date'].dt.strftime('%Y-%m') == selected_month_str)
        ].empty
        
        wc_done = not df_txns[
            (df_txns['description'] == "Monthly War Chest") & 
            (df_txns['date'].dt.strftime('%Y-%m') == selected_month_str)
        ].empty

        if not ef_done:
            if st.button(f"Confirm Emergency Fund ({selected_month_str})"):
                # Use the 1st of that month
                t_date = f"{selected_month_str}-01"
                db.add_transaction(t_date, emergency_fund_contribution, "Monthly Emergency Fund", "Savings", "Expense", "Auto", "#emergency")
                st.success("Confirmed!")
                st.rerun()
        else:
            st.success(f"✅ Emergency Fund ({selected_month_str})")
            
        if not wc_done:
            if st.button(f"Confirm War Chest ({selected_month_str})"):
                t_date = f"{selected_month_str}-01"
                db.add_transaction(t_date, war_chest_contribution, "Monthly War Chest", "Savings", "Expense", "Auto", "#warchest")
                st.success("Confirmed!")
                st.rerun()
        else:
            st.success(f"✅ War Chest ({selected_month_str})")
            
        st.caption(f"Gold Drip: {gold_fixed_amt:,.0f} AED (Manual/Drip)")


    st.divider()
    
    # === NEW SECTION: To-Do List & Yearly Progress ===
    c_todo, c_progress = st.columns([1, 2])
    
    with c_todo:
        st.markdown("### ✅ To-Do List")
        # Padding Container
        with st.container(border=True):
            # Quick Add
            with st.form("new_todo", clear_on_submit=True):
                new_task = st.text_input("New Task", placeholder="Pay DEWA...")
                if st.form_submit_button("Add"):
                    db.add_todo(new_task)
                    st.rerun()
            
            # List
            todos = db.get_todos()
            if not todos.empty:
                for index, row in todos.iterrows():
                    cols = st.columns([0.1, 0.9])
                    done = cols[0].checkbox("", key=f"todo_{row['id']}")
                    if done:
                        db.delete_todo(row['id'])
                        st.rerun()
                    cols[1].write(row['task'])
            else:
                st.caption("No tasks pending.")
    
    with c_progress:
        st.markdown("### 📅 Yearly Savings Map")
        
        # Yearly Progress for Savings
        if not df_txns.empty:
            confirmed_months = df_txns[df_txns['description'] == "Monthly Savings"]['date'].dt.strftime('%Y-%m').unique().tolist()
        else:
            confirmed_months = []
            
        # Display chips
        # Let's show Dec 2025 -> Dec 2026 range? Or just standard months.
        # Let's do a static range of months relevant to the user (e.g., Dec 25 - Dec 26)
        months_to_show = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", 
                          "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]
        
        # CSS Grid for visual chips
        st.markdown("""
        <style>
        .month-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
            gap: 10px;
        }
        .month-chip {
            padding: 10px;
            border-radius: 8px;
            text-align: center;
            font-size: 0.8em;
            font-weight: bold;
        }
        .month-done {
            background-color: #00FF00;
            color: black;
            border: 1px solid #00FF00;
        }
        .month-pending {
            background-color: #333333;
            color: gray;
            border: 1px solid #555;
        }
        </style>
        """, unsafe_allow_html=True)
        
        html_content = '<div class="month-grid">'
        for m in months_to_show:
            month_name = datetime.strptime(m, "%Y-%m").strftime("%b %y")
            status_class = "month-done" if m in confirmed_months else "month-pending"
            indicator = "✅" if m in confirmed_months else "⏳"
            html_content += f'<div class="month-chip {status_class}">{month_name}<br>{indicator}</div>'
        html_content += '</div>'
        
        st.markdown(html_content, unsafe_allow_html=True)
    
    
# --- TAB 2: ANALYTICS ---
with tab2:
    st.subheader("Spending Analytics")
    if not df_txns.empty:
        # 1. Spend by Category Pie Chart
        st.markdown("#### Where is the money going?")
        expense_df = df_txns[df_txns['type'] == 'Expense']
        if not expense_df.empty:
            cat_group = expense_df.groupby('category')['amount'].sum().reset_index()
            # Sort by amount
            cat_group = cat_group.sort_values(by='amount', ascending=False)
            
            c1, c2 = st.columns([2, 1])
            with c1:
                st.bar_chart(data=cat_group, x='category', y='amount', color='#FF4B4B')
            with c2:
                st.dataframe(cat_group, hide_index=True)
        else:
            st.info("No expenses recorded yet to analyze.")
            
        # 2. Daily Spend Trend
        st.markdown("#### Daily Spend Trend")
        if not expense_df.empty:
            daily_group = expense_df.groupby('date')['amount'].sum()
            st.line_chart(daily_group)

# --- TAB 3: SETTINGS & NET WORTH ---
with tab3:
    st.subheader("💰 Net Worth & Configuration")
    
    with st.form("settings_form"):
        st.markdown("### 🏦 Current Balances (One-time Setup / Updates)")
        
        col_s1, col_s2 = st.columns(2)
        with col_s1:
            st.markdown("**Assets**")
            init_wc = st.number_input("Real Estate Savings Cash", value=st.session_state['initial_war_chest'])
            man_assets = st.number_input("Stocks / Crypto / Other Liquid", value=st.session_state['assets_manual'])
            real_estate_val = st.number_input("Existing Real Estate Property Value", value=st.session_state['assets_real_estate'])
            
        with col_s2:
            st.markdown("**Liabilities**")
            mortgage_bal = st.number_input("Outstanding Mortgage Balance", value=st.session_state['mortgage_balance'])
            other_liabs = st.number_input("Other Loans / Liabilities", value=st.session_state['liabilities'])
        
        save_settings = st.form_submit_button("Update Balances")
        if save_settings:
            st.session_state['initial_war_chest'] = init_wc
            st.session_state['assets_manual'] = man_assets
            st.session_state['assets_real_estate'] = real_estate_val
            st.session_state['liabilities'] = other_liabs
            st.session_state['mortgage_balance'] = mortgage_bal
            st.success("Balances Updated!")
            st.rerun()

    st.divider()
    
    # Net Worth Calculation
    total_liquid = remaining_safe_to_spend + total_savings_fund + 0.0 + st.session_state['assets_manual'] # Gold value removed from here
    total_assets_calc = total_liquid + st.session_state['assets_real_estate']
    total_liabilities_calc = st.session_state['liabilities'] + st.session_state['mortgage_balance']
    
    net_worth = total_assets_calc - total_liabilities_calc
    
    nw_col1, nw_col2, nw_col3 = st.columns(3)
    nw_col1.metric("Total Assets", f"AED {total_assets_calc:,.2f}", delta=f"Real Estate: {st.session_state['assets_real_estate']:,.0f}")
    nw_col2.metric("Total Liabilities", f"AED {total_liabilities_calc:,.2f}", delta=f"Mortgage: {st.session_state['mortgage_balance']:,.0f}", delta_color="inverse")
    nw_col3.metric("Net Worth", f"AED {net_worth:,.2f}")

    st.divider()
    
    # Bonus Splitter (Moved Here)
    with st.expander("💸 Bonus Splitter"):
        bonus_amt = st.number_input("Bonus Amount", min_value=0.0, step=1000.0)
        if st.button("Process Bonus"):
            save_share = bonus_amt * 0.90
            fun_share = bonus_amt * 0.10
            # Auto-add to DB?
            st.success(f"Strategy:\n- 🏦 Transfer AED {save_share:,.2f} to Savings\n- 🎉 Keep AED {fun_share:,.2f} for Guilt-Free Spending")
            if st.button("Add Bonus to Ledger"):
                 db.add_transaction(datetime.now().strftime("%Y-%m-%d"), bonus_amt, "Bonus Received", "Bonus", "Income", "Manual", "#bonus")
                 st.success("Bonus Recorded!")

# --- TAB 4: DATA ---
with tab4:
    st.subheader("📝 Transaction Log (Editable)")
    
    # Filter functionality
    with st.expander("Filter Transactions"):
        f_cat = st.multiselect("Category", df_txns['category'].unique() if not df_txns.empty else [])
    
    display_df = df_txns
    if f_cat and not df_txns.empty:
        display_df = df_txns[df_txns['category'].isin(f_cat)]

    if not display_df.empty:
        # Editorial Table with Dropdown Config
        categories_list = [
            "Food & Drinks", "Transport", "Entertainment", "Items", "Service",
            "Guilt-Free Spending", "Fixed Cost", "Savings", "Bonus", "Housing", "Gold Purchase", "Misc"
        ]
        
        edited_df = st.data_editor(
            display_df, 
            num_rows="dynamic", 
            key="data_editor",
            use_container_width=True,
            column_config={
                "category": st.column_config.SelectboxColumn(
                    "Category",
                    help="Select the transaction category",
                    options=categories_list,
                    required=True,
                ),
                "type": st.column_config.SelectboxColumn(
                    "Type",
                    options=["Expense", "Income"]
                )
            }
        )
        
        # Check for changes and apply to DB
        # This is a bit manual because st.data_editor doesn't sync to SQL auto-magically
        # Simplification: We added an "Save Changes" button to commit the ENTIRE view? 
        # Or better: Just detect diff?
        # Detecting diffs is complex in one go. 
        # Strategy: Data Editor is great for "Visuals", but for DB updates, let's use a explicit save button if possible,
        # OR just handle the `st.session_state['data_editor']` on change.
        
        # Simple approach for reliability:
        # Add a "Save Changes" button that takes the `edited_df` and iterates?
        # Ideally we only update changed rows.
        
        if st.button("💾 Save Changes to Database"):
            # This is heavy but safe: Iterate and update all? 
            # Or better: We assume standard usage.
            # Let's iterate through rows and update them by ID.
            # If ID is None (new row), add it.
            # If ID exists, update.
            # Deleted rows? data_editor handles deletions visually but we need to know what was deleted.
            
            # Since tracking deletions is hard without change_state, let's look at the result.
            # Actually, `st.data_editor` state returns `added_rows`, `deleted_rows`, `edited_rows`.
            
            changes = st.session_state["data_editor"]
            
            # 1. Edit
            for idx, row_changes in changes["edited_rows"].items():
                # Get original ID from the dataframe using the index
                # Note: Streamlit index might match df index if not filtered/sorted
                # Safety: Use the `id` column from the original df at that index
                t_id = display_df.iloc[idx]['id']
                
                # We need to construct the full new row or just update changed fields.
                # update_transaction expects all fields.
                # Let's get the original row
                orig_row = display_df.iloc[idx].copy()
                # Update with changes
                for k, v in row_changes.items():
                    orig_row[k] = v
                
                db.update_transaction(
                    t_id, 
                    orig_row['date'].strftime('%Y-%m-%d') if isinstance(orig_row['date'], datetime) else str(orig_row['date']), 
                    orig_row['amount'], 
                    orig_row['description'], 
                    orig_row['category'], 
                    orig_row['type'], 
                    orig_row['source'], 
                    orig_row['tag']
                )

            # 2. Delete
            for idx in changes["deleted_rows"]:
                t_id = display_df.iloc[idx]['id']
                db.delete_transaction(t_id)
                
            # 3. Add
            for new_row in changes["added_rows"]:
                # defaults
                db.add_transaction(
                    new_row.get("date", datetime.now().strftime("%Y-%m-%d")),
                    new_row.get("amount", 0.0),
                    new_row.get("description", "New Transaction"),
                    new_row.get("category", "Misc"),
                    new_row.get("type", "Expense"),
                    new_row.get("source", "Manual"),
                    new_row.get("tag", "")
                )
            
            st.success("Database Updated!")
            st.rerun()

    else:
        st.info("No transaction data.")

    st.divider()
    st.markdown("### Manual Entry")
    with st.form("manual_tx_tab"):
        d_date = st.date_input("Date")
        d_desc = st.text_input("Description")
        d_amt = st.number_input("Amount", min_value=0.0)
        d_type = st.selectbox("Type", ["Expense", "Income"])
        
        # Extended Categories
        categories_list = [
            "Food & Drinks", "Transport", "Entertainment", "Items", "Service", # New
            "Guilt-Free Spending", "Fixed Cost", "Savings", "Bonus", "Housing", "Gold Purchase", "Misc"
        ]
        d_cat = st.selectbox("Category", categories_list)
        d_tag = st.text_input("Tag (e.g., #bonus, #gold)")
        
        submitted = st.form_submit_button("Add Transaction")
        if submitted:
            db.add_transaction(
                d_date.strftime("%Y-%m-%d"), 
                d_amt, 
                d_desc, 
                d_cat, 
                d_type, 
                "Manual", 
                d_tag
            )
            st.success("Added!")
            st.rerun()

