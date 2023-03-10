const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yrcmf.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const appointmentOptionsCollection = client.db('doctors_portal').collection('appointmentOptions');
        const bookingsCollection = client.db('doctors_portal').collection('bookings');
        const usersCollection = client.db('doctors_portal').collection('users');

        // use aggregate to query multiple collection & then merge data
        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date;
            // console.log(date);

            const query = {};
            const options = await appointmentOptionsCollection.find(query).toArray();

            const bookingQuery = { appointmentDate: date }
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();

            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
                const bookedSlots = optionBooked.map(book => book.slot)
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots;
                // console.log(option.name, bookedSlots, remainingSlots.length);
            })
            res.send(options);
        });

        /****
         * API naming convention
         * bookings
         * app.get('/bookings')
         * app.get('/bookings/:id')
         * app.post('/bookings') ~~ create data ~~
         * app.patch('/bookings/:id') ~~ update data ~~
         * app.delete('/bookings/:id') ~~ delete data ~~
        ****/

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            // console.log(booking);

            const query = {
                email: booking.email,
                appointmentDate: booking.appointmentDate,
                treatment: booking.treatment
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You already have a booking on ${booking.appointmentDate}`;
                return res.send({ acknowledged: false, message });
            }
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            // console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', async (req, res) => {
    res.send("doctor portal server is running");
})

app.listen(port, () => console.log(`Doctors portal is running on port ${port}`));