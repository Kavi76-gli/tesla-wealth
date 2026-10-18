const User = require('../models/user');
const Investment = require('../models/investment');
const Transaction = require('../models/transaction');
// GET USER DETAILS (STATS & HISTORY)
exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Fetch logs
        const investments = await Investment.find({ userId: req.userId });
        const transactions = await Transaction.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json({
            success: true,
            user,
            investments,
            transactions
        });
    } catch (err) {
        console.error('Get Details Error:', err);
        res.status(500).json({ success: false, message: 'Server database fetch failed.' });
    }
};
// RENT MACHINERY CONTRACT
exports.purchasePlan = async (req, res) => {
    const { planId, planName, cost, dailyYield, durationDays } = req.body;
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (user.balance < cost) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
        }
        // Deduct balance and increment active plans count
        user.balance -= cost;
        user.activeInvestments += 1;
        user.dailyYield += dailyYield;
        await user.save();
        // Create lease record
        const investment = new Investment({
            userId: user._id,
            planId,
            planName,
            cost,
            dailyYield,
            durationDays,
            remainingDays: durationDays
        });
        await investment.save();
        // Create transaction log
        const txId = 'TX' + Math.floor(1000 + Math.random() * 9000);
        const transaction = new Transaction({
            userId: user._id,
            txId,
            type: `${planName.replace('Kubota ', '')} Purchase`,
            amount: -cost
        });
        await transaction.save();
        res.json({
            success: true,
            message: 'Machinery commissioned successfully!',
            user: {
                balance: user.balance,
                activeInvestments: user.activeInvestments,
                dailyYield: user.dailyYield
            }
        });
    } catch (err) {
        console.error('Purchase Plan Error:', err);
        res.status(500).json({ success: false, message: 'Server purchase contract failed.' });
    }
};
// SIMULATE DAILY YIELDS (INSTANT TICK FOR DEMONSTRATION)
exports.simulateYieldTicks = async (req, res) => {
    try {
        const activeLeases = await Investment.find({ active: true });
        
        let payoutCount = 0;
        for (const lease of activeLeases) {
            const user = await User.findById(lease.userId);
            if (!user) continue;
            // Credit yields
            user.balance += lease.dailyYield;
            user.earnings += lease.dailyYield;
            await user.save();
            // Decrement remaining term days
            lease.remainingDays -= 1;
            if (lease.remainingDays <= 0) {
                lease.active = false;
                user.activeInvestments = Math.max(0, user.activeInvestments - 1);
                user.dailyYield = Math.max(0, user.dailyYield - lease.dailyYield);
                await user.save();
            }
            await lease.save();
            // Log yield payout
            const txId = 'TX' + Math.floor(1000 + Math.random() * 9000);
            const payoutTx = new Transaction({
                userId: user._id,
                txId,
                type: `${lease.planName.replace('Kubota ', '')} Payout`,
                amount: lease.dailyYield
            });
            await payoutTx.save();
            payoutCount++;
        }
        res.json({ success: true, message: `Yields processed for ${payoutCount} active machinery leases.` });
    } catch (err) {
        console.error('Yield Tick Error:', err);
        res.status(500).json({ success: false, message: 'Failed to simulate daily ticks.' });
    }
};
