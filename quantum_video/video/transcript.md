# Transcript: Verifiable Quantum Circuit Compilation, explained


## Introduction: the competition in one picture  (00:00)

Could we get more out of a quantum computer by asking it to do less? That is the question behind Google Quantum AI's Kaggle competition: Verifiable Quantum Circuit Compilation.

The prize pool is one hundred and fifty thousand dollars, and the organizers say you don't need a quantum computing background to take part. But you do need a working vocabulary. Words like Toffoli gate, uncomputation, phase kickback, syndrome, block encoding. Without them, the discussion forum reads like a foreign language.

This video builds that vocabulary from the ground up, with pictures. By the end, you should be able to read the competition paper, follow the forum, and start designing circuits of your own.

Here is the whole competition in one picture. Future error-corrected quantum computers will run enormous algorithms. Inside each algorithm there is usually one subroutine that eats most of the cost.

Your job is to rewrite that subroutine as a cheaper circuit. Fewer qubits, and fewer of the expensive gates called Toffoli gates. But it must still compute the right answer, and a program called the verifier checks that it does.

There are three such subroutines, each taken from a real application.

One: phasing by one over the square root of x. That's the bottleneck when simulating the electrons inside a fusion plasma.

Two: decoding a Reed–Solomon code, the bottleneck of an optimization algorithm called decoded quantum interferometry.

And three: looking up stored angles and rotating orbitals. That's the bottleneck of simulating FeMoCo, the cluster inside the enzyme that lets bacteria turn nitrogen from the air into fertilizer.

Each benchmark ships with a reference circuit from published research, and a cost formula. Your ratio on a task is the reference cost divided by your cost. Match the reference and you get one. Build a circuit ten times cheaper and you get ten.

The leaderboard score is the geometric mean of your three ratios. Because it's a product, doubling your ratio on any one task helps exactly as much as doubling it on any other. You can't ignore a task, but you can attack them one at a time.

Now here is the surprising part. Checking whether a general quantum circuit is correct is believed to be intractable for classical computers, beyond about forty qubits.

Yet this competition's verifier checks circuits with hundreds of qubits and millions of gates on an ordinary CPU. The reason is a special kind of circuit, called a kickmix circuit. Understanding why kickmix circuits can be checked is the key to the whole competition.

Here's the plan. First, the minimum quantum computing you need: qubits, gates, and why some gates cost far more than others. Then kickmix circuits, and how they're verified. Then the standard toolkit of tricks that every top solution uses. Then each of the three benchmarks in detail. And finally: how the scoring works, how to submit, and where the points are hiding.


## 1. Bits, qubits and amplitudes  (03:14)

Let's start with what a quantum computer stores: qubits. And to understand a qubit, start with an ordinary bit.

A bit is either zero or one. A register of n bits holds exactly one of two to the n possible values. Three bits hold one of eight values: for example one, zero, one, which is the number five.

A qubit is described differently. Its state is a pair of numbers called amplitudes: one for zero, and one for one. We write it like this: alpha, ket zero, plus beta, ket one. The angled bracket, called a ket, is just a label for one of the basis states.

Picture the state as an arrow of length one. Pointing along the horizontal axis, it is ket zero. Pointing straight up, it is ket one. Anywhere in between, it's a superposition: a bit of each.

When you measure a qubit, you never see the amplitudes. You see zero, with probability alpha squared, or one, with probability beta squared, and the state collapses to whatever you saw. That's why the arrow has length one: the two probabilities must add up to one.

Measure many copies of this state and roughly a quarter of the results are zero, and three quarters are one.

Amplitudes can be negative, and in general they're complex numbers. That's the real difference from ordinary probabilities. Two ways of reaching the same outcome can cancel each other out. This is called interference, and it's where every quantum speedup comes from.

Amplitudes are also where phases live. A phase is a complex number of size one, e to the i theta, a point on the unit circle. Multiplying a whole state by a phase changes nothing you could ever measure.

But a phase on one part of a superposition, relative to another part, changes how those parts interfere later on. Keep this in mind. Two of the three benchmarks are about putting exactly the right phase on each basis state.

Now take several qubits. With n qubits there are two to the n basis states, one for every n-bit string, and a general state has an amplitude for every one of them. Three qubits: eight amplitudes.

Fifty qubits: about a million billion amplitudes. A few hundred qubits: more numbers than there are atoms in the universe. That's why simulating a quantum computer in general is exponentially hard.

But notice something. If the state is a single basis state, like ket one, zero, one, then only one amplitude is non-zero. You can describe the whole state with three bits, plus one number for its phase. Hold on to this idea. It's the seed of everything the verifier does.

One last idea: entanglement. A two-qubit state like ket zero zero plus ket one one, over root two, can't be split into a separate state for each qubit. Measure one qubit, and you instantly know the other.

In this competition you'll meet entanglement in a specific form. A circuit computes some function f of x into scratch qubits, which entangles the scratch with the input. Before it finishes, the circuit must disentangle them again. That's called uncomputation, and it's where a lot of the cost, and a lot of the cleverness, lives.


## 2. Gates, circuits and reversible logic  (06:40)

A quantum computation is a sequence of gates applied to qubits, drawn as a circuit. Each horizontal line is one qubit. Time flows from left to right, and each symbol on a line is a gate acting on that qubit.

The simplest gate is X, the quantum NOT. It turns ket zero into ket one, and ket one into ket zero.

On a superposition, it simply swaps the two amplitudes.

Next, the controlled NOT, or CNOT. The dot is the control, and the circle with the plus is the target. If the control is one, the target flips. Otherwise, nothing happens. Put another way: the target becomes target XOR control.

Then the Toffoli gate, also called C C X: two controls and one target. The target flips only when both controls are one.

If the target starts at zero, the Toffoli computes the AND of the two controls. Remember this gate. It's the currency of the whole competition: most of your score is the number of Toffolis your circuit uses.

These gates permute basis states. Each input bit string goes to exactly one output bit string, and no two inputs collide, so no information is ever lost. That's what makes them reversible: run the circuit backwards, and you undo it exactly. Quantum mechanics demands this. Every gate, apart from measurement, must be reversible.

With X, CNOT and Toffoli you can build any classical computation reversibly: adders, multipliers, comparisons, even a complete error-correction decoder. The trick is never to overwrite anything. Each result is written into fresh qubits that start at zero. Those extra qubits are called ancillas, or scratch qubits.

There's a catch, and it's the central theme of this competition. Scratch qubits fill up with intermediate values: garbage. If garbage stays entangled with your data, it ruins the interference later in the algorithm. So every scratch qubit must be returned to zero. That's uncomputation.

The classic recipe, due to Charles Bennett: compute, copy the answer out with CNOTs, then run the computation backwards. The scratch returns to zero. But you paid for the computation twice.

Now the second family: phase gates. The Z gate leaves ket zero alone, and multiplies ket one by minus one. It changes no bits at all, only a sign. The controlled Z, or C Z, puts a minus sign only on ket one one. And C C Z, only on ket one one one.

More generally, Z to the power t multiplies ket one by e to the i pi t. In kickmix this gate is called Z underscore POW.

For t equal to one, it's Z. For one half, it's called the S gate. For one quarter, the T gate. Any other angle is a general rotation. As we'll see in the next chapter, these have wildly different prices.

Here's the key property. Phase gates are diagonal: each basis state goes to itself, times a phase. Permutation gates move one basis state to another. So a circuit built only from these two kinds of gates sends every basis state to a single basis state, times a phase. Remember the seed from chapter one? This is the property the whole verifier is built on.

One more gate: the Hadamard, H. This is the gate that creates superpositions. It turns ket zero into an equal mix of zero and one. Hadamards, and the quantum Fourier transform built from them, are where interference happens in an algorithm.

But those parts of the algorithm aren't in this competition. Inside the competition's circuits, H only appears in one disguised form, as part of a special measurement. We'll meet it in chapter four.

Put it together, and you get the pattern you'll see everywhere in this competition: compute, phase, uncompute. To multiply each basis state ket x by a phase that depends on some function f of x: compute f of x into scratch qubits. Apply phase gates to the bits of f of x. Then uncompute f.

The scratch returns to zero, and only the phase is left behind. Benchmark one is exactly this pattern, with f of x equal to one over the square root of x.


## 3. Why Toffolis are expensive  (11:16)

Why does the competition count Toffoli gates, rather than all gates equally? Because real qubits are noisy. Today's best physical qubits make an error roughly once every thousand operations, and the algorithms in this competition need billions of operations.

The fix is quantum error correction. Many physical qubits, hundreds up to a thousand or so, are woven together into one logical qubit that is far more reliable, for example a patch of the surface code. Algorithms, including every circuit in this competition, are written in terms of logical qubits.

Error-corrected computers can do some gates cheaply. These are the Clifford gates: X, Z, H, S, CNOT and CZ. On the surface code, they're nearly free. But Clifford gates alone aren't enough: circuits made only of Cliffords can be simulated efficiently on an ordinary computer, so they can't give any quantum advantage.

To go beyond, you need a non-Clifford gate, like T or Toffoli. These need special resource states called magic states, which are produced in factories that take up a big chunk of the machine and a lot of time. So the number of non-Clifford gates largely sets the runtime of the whole algorithm.

You can picture it like this. The computation runs Clifford gates freely, but every Toffoli has to wait for a magic state to arrive from the factory.

So here's the cost model this competition uses. Count the Toffoli-like gates: C C X, C C Z, and the controlled swap. Count T gates, at a quarter of a Toffoli each.

Arbitrary rotations have to be built out of many T gates, and the more precise the rotation, the more T gates it takes. In benchmark one, a rotation with error epsilon is priced at zero point five six times log base two of one over epsilon, plus five point three, T gates.

Clifford gates, measurement and classical logic are free. And qubits are counted too, because each logical qubit costs hundreds of physical ones.

For example, a rotation accurate to one part in a billion, about thirty bits, costs around twenty two T gates. That's five and a half Toffolis' worth, for a single rotation. So fewer rotations, and looser precision where you can afford it, both save cost.

Each benchmark combines these into one number. Roughly speaking: qubits times Toffolis. Think of it as a space-time volume. How much machine you need, times how long you need it for.

Halve the qubits, or halve the Toffolis, and the cost halves either way.

And notice what's free: X, CNOT, Z, C Z, swaps, measurement, and classical logic. Any trick that replaces a Toffoli with a handful of free gates is a pure win. And as you're about to see, measurement is the most valuable free tool you have.


## 4. kickmix circuits and measurement-based uncomputation  (14:23)

Now we can define kickmix circuits. A kickmix circuit is allowed only four kinds of instruction. Reversible classical gates: X, CNOT, Toffoli and swap. Diagonal phase gates: Z, C Z, C C Z, Z POW, and NEG, which flips the overall sign.

Measurement and reset: HMR and R. And operations on classical bits, which store measurement results. On top of that, any instruction can be conditioned on classical bits, so you can say: do this only if that measurement gave one.

Feed a kickmix circuit a basis state, and every instruction maps it to a single basis state, times a phase. So to simulate it, you only need to store one bit per qubit, plus one number for the phase.

Simulating a gate is just flipping a bit, or flipping the sign. The time grows linearly with the number of gates, not exponentially with the number of qubits.

And kickmix is fast. It's a C plus plus library with Python bindings, inside Google's Qualtran package. It packs between sixty four and five hundred twelve independent runs, called shots, into the CPU's vector registers, and simulates tens of billions of gate applications per second on a single core.

The most interesting instruction is HMR, pronounced hammer: Hadamard, measure, reset. It measures a qubit in the X basis, records a random bit b, and resets the qubit to zero.

Here's why it matters. Suppose a scratch qubit holds a function of the other qubits, f of x. Hammer it. The qubit comes back as zero, cleanly disentangled. In exchange, you get a random bit b, and the state picks up a phase: minus one to the power b times f of x.

If b is zero, nothing happened. You're done. If b is one, there's a wrong sign on exactly the states where f of x is one. But you know b. It's a classical bit. So you can undo the sign with a phase gate on the qubits that f was computed from, conditioned on b.

The classic example is the temporary AND. Computing a and b into a fresh qubit costs one Toffoli. You use the result for a while.

Uncomputing it the textbook way, by running the Toffoli again, costs a second Toffoli. Instead: hammer it. If the measurement gives one, apply a C Z between a and b. That cancels the stray sign exactly, because the sign was on a AND b.

A C Z is a Clifford gate. It's free. You've just halved the cost of every temporary value in your circuit. This trick is due to Craig Gidney, one of the authors of the competition paper, and it's everywhere: in the reference circuits, and in every top solution.

What if you hammer a qubit and forget the fix-up? Then the phase is wrong whenever the random bit comes out one, which is half the time. The simulator draws those bits at random, so the bug shows up in about half the shots, and the verifier catches it.

The plain reset instruction, R, works the same way. Resetting a qubit that isn't zero gives a random sign flip. Garbage can't be quietly thrown away. Every bit of it has to be genuinely uncomputed.

This is measurement-based uncomputation. The general lesson: computing a value costs Toffolis. Erasing a value, by measuring it and fixing up the phase, is often nearly free, as long as the fix-up itself is cheap.

One subtle point that matters for scoring. The verifier counts the Toffolis actually executed in each shot, then averages over shots. A Toffoli that's conditioned on a measured bit only counts on the shots where it runs. So clever classical control can lower your average cost.


## 5. How circuits are verified  (18:20)

So how does the verifier decide that a circuit is correct? It runs the circuit on classical inputs, and on every shot it checks three things. The input registers hold their original values. Every scratch qubit is back to zero. And the accumulated phase matches the target, within the benchmark's tolerance.

When the set of possible inputs is small enough, you can simply test all of them. In benchmark one, that's exactly what happens: every one of the three point one million inputs, sixty four times each. That's two hundred million shots.

When the input space is astronomically large, like the eight hundred and forty qubit syndromes of benchmark two, the verifier samples inputs at random instead. That's called fuzz testing. It can't prove that a circuit is perfect, but it can put a bound on how often it fails.

Why run each input sixty four times? Because the hammer outcomes are random. A missing fix-up only shows up on some outcomes. A bug that strikes with probability one half per shot slips past all sixty four shots with probability two to the minus sixty four. That's essentially never.

But who picks the random test inputs? If the tests were fixed and public, someone could hard-code the answers for exactly those inputs.

The trick is called the Fiat Shamir heuristic. The verifier takes the bytes of your circuit file, hashes them with SHA-256, and uses the hash as the seed of the random number generator that picks the test inputs and the measurement outcomes.

Change a single byte of your circuit, and you get a completely different hash, and so a completely different set of tests. You can't know the tests until you've committed to the circuit.

One more defence. Without it, you could add do-nothing gates to your circuit over and over, until the hash happened to pick easy tests. That's called seed grinding. So the competition mixes a secret salt into the hash, which is only revealed after submissions are fixed.

From the results, the verifier computes an upper bound on the true failure rate: a one-sided Clopper Pearson bound, at confidence one minus two to the minus one hundred and twenty eight. If a circuit fails on a fraction epsilon of inputs, the chance that it passes N shots in a row is one minus epsilon, to the N.

With zero failures, that gives a bound of about eighty nine divided by N. So a hundred thousand clean shots certify a failure rate below about one in a thousand.

Why does passing on classical inputs tell you anything about superpositions, which is what the real algorithm feeds in? The paper proves it. If the circuit fails on a fraction epsilon of inputs, with inputs drawn from the distribution the real algorithm would produce, then the output state is within distance two root epsilon of the ideal one. That's why each benchmark carefully specifies how its test inputs are drawn.

And that has a big consequence: approximate circuits are allowed. Dropping a rarely needed carry bit, truncating a register, stopping a loop early: all legal, as long as the errors stay within budget. In benchmark one, every shot must pass, but the phase only has to be close. In benchmark two, occasional failures are allowed, and cost you a penalty.


## 6. The toolkit: AND, adders, multipliers, lookups  (21:49)

Before we get to the benchmarks, let's fill the toolbox. These are the building blocks you'll find in kickmix's builder library, and in nearly every forum post about this competition.

Addition. To add a into b, you ripple a carry from the lowest bit to the highest. Each carry is a majority function of three bits, and with the temporary AND trick it costs one Toffoli per bit.

Then you sweep back down, writing the sum and erasing each carry by measurement, at no Toffoli cost. So adding two n-bit numbers costs about n Toffolis. Comparing and subtracting cost about the same. This construction is from Craig Gidney's paper, halving the cost of quantum addition. It's worth reading.

Multiplication of two n-bit numbers is basically n additions of shifted partial products: about n squared Toffolis. That's why big multiplications dominate any arithmetic circuit.

But you rarely need every bit of a product. In fixed-point arithmetic, you can drop the partial products that only affect bits you'll throw away anyway, as long as the error is accounted for. Truncated multipliers are one of the most common savings.

Which brings us to fixed point. There are no floating-point numbers in these circuits. A number is just an integer with an implied binary point, and every design decision is about how many bits to keep in each register. Fewer bits mean fewer Toffolis and fewer qubits, but more error.

Shifts. Multiplying by a known power of two costs nothing: you just relabel which wire means which bit. But shifting by an amount that's stored in a quantum register needs controlled swaps, a barrel shifter, and each controlled swap costs a Toffoli.

Now the single most important tool in this competition: the quantum lookup table, called QROM. A table of classical data is baked into the circuit. Given an address register holding a, the lookup XORs the data word d of a into a target register.

Because the address register can be in superposition, one lookup reads every entry at once, each into its own branch of the superposition.

How does it work? With a technique called unary iteration. Picture a binary tree over all the addresses. Walking down the tree, each node is a temporary AND of its parent with one address bit.

For any address, exactly one leaf ends up switched on: the one matching the address. With the right bookkeeping, the circuit visits every leaf in turn, spending about one Toffoli per leaf.

At each leaf, the stored word is copied into the target with CNOTs controlled by that leaf. CNOTs are free. So the width of the words doesn't matter.

So a lookup over L entries costs about L Toffolis, regardless of how wide the words are. A table of five hundred and twelve entries with ninety-bit words costs about five hundred and twelve Toffolis. That's why lookups are a favourite trick: whenever a table is small, replace arithmetic with precomputed data.

And erasing a lookup's output is even cheaper: measure the target, then repair the phases with a much smaller lookup, for roughly the square root of L. There are also space-time trade-offs, known as select-swap networks, that spend extra qubits to cut the Toffoli count further.

And the last tool is classical precomputation. Anything that doesn't depend on the quantum input: coefficients, tables, constants, even the structure of the circuit itself, can be computed offline, for free. A big part of every winning idea in this competition is moving work out of the quantum circuit, and into classical preprocessing.


## 7. Benchmark I: phasing by 1/sqrt(x)  (25:46)

Benchmark one comes from simulating matter under extreme conditions, like the inside of an inertial confinement fusion capsule. A key quantity for designing such reactors is the stopping power: how quickly a fast particle loses energy as it ploughs through a hot, dense plasma of electrons.

In this simulation, electrons live on a three-dimensional grid, and each electron gets a register holding its coordinates. The energy has three parts: kinetic energy, attraction to the nuclei, and repulsion between every pair of electrons. That last term is one over the distance between the two electrons.

Time evolution is done in small steps, called Trotter steps. In each step, for every pair of electrons, the state is multiplied by a phase: e to the minus i, times a small time step, times one over their distance. With eta electrons, that's about eta squared pairs, every single step. That's the bottleneck.

Squared distance is a sum of squared coordinate differences, so it's an integer. Call it x. Then the core subroutine is: given an integer x in a quantum register, multiply the state by e to the two pi i over the square root of x. Compute, phase, uncompute.

Precisely: the circuit gets one named register, x, of twenty two qubits. It must work for every x from one up to three million, one hundred thirty three thousand, four hundred fifty two. That's the largest squared distance on a grid with ten bits per coordinate.

The phase is measured in turns, fractions of a full circle, and it must be accurate to two to the minus twenty four, divided by root x. That's twenty four bits of relative precision. The register x must come back unchanged, and every scratch qubit must return to zero.

How do you apply a phase that's stored as a number in a register? If y is a binary fraction, then e to the two pi i y is a product of one phase per bit. So you apply one Z POW gate to each bit of y, with an angle that halves from bit to bit.

The biggest angles are Clifford gates, which are free. The eighth of a turn is a T gate. Everything finer is a rotation, and costs real T gates.

The reference circuit borrows an idea made famous by the video game Quake Three: the fast inverse square root. Make a cheap first guess, then improve it with one step of Newton's method. The quantum version works in fixed point, in three stages.

Stage one: normalize. Count the pairs of leading zeros, call that s, and shift x left by two s bits. Now the number sits between one and four, whatever x was. And since dividing by the square root of four to the s is the same as halving s times, the shift just turns into a shift of the answer at the end.

Stage two: a cheap first guess. A cubic polynomial, with coefficients chosen by the top bits of the normalized input, approximates one over root x. The two curves are nearly indistinguishable: the guess is good to about fourteen bits.

Stage three: one step of Newton's method. Each Newton step roughly doubles the number of correct bits. Fourteen bits become about twenty seven, comfortably more than the twenty four required. It costs three multiplications.

Then shift the result by s, apply one Z POW gate per bit, and run everything backwards to clean up.

The reference circuit uses two hundred sixty qubits and seven thousand seven hundred thirty five Toffolis, plus one T gate and thirty seven rotations. The cost per shot is Toffolis plus T gates over four, about seven thousand nine hundred eighty eight. And the score is qubits times that: about two point oh eight million.

One subtlety in the pricing. The rotation precision isn't something you choose. The verifier measures your worst-case arithmetic error, takes the leftover margin under the tolerance, and splits it evenly across all your rotations. So more accurate arithmetic makes every rotation cheaper, and fewer rotations each get a bigger share of the slack.

Where are the points? Within days of launch, public notebooks had pushed this to about seventy eight qubits and under seventeen hundred Toffoli equivalents: roughly sixteen times cheaper than the reference. The area of the green box, compared to the red one, is that improvement.

The ideas behind those gains: replace Newton's method with a table lookup and a short polynomial. Use signed digits, so each step of the polynomial is a plain addition or subtraction instead of a multiplication. Keep every register as narrow as the error budget allows. Erase everything by measurement. And remember that qubits multiply the whole cost: at around eighty qubits, each qubit you remove is worth more than one percent.

And a practical tip. Before you build any circuit, write a bit-exact model of your fixed-point arithmetic in NumPy. You can check your error on all three million inputs in milliseconds, and only build the circuit once the numbers work.


## 8. Benchmark II: Reed-Solomon decoding for DQI  (31:14)

Benchmark two is the most mathematical of the three, so let's take it slowly. It comes from an algorithm called decoded quantum interferometry, or D Q I, proposed by researchers at Google in twenty twenty four. It's one of the most promising candidates for a useful quantum advantage in optimization.

The optimization problem is called optimal polynomial intersection. You're given a list of points. At each point there's a set of allowed values, the blue squares. The goal: find a polynomial of low degree whose value lands inside the allowed set at as many points as possible.

Checking a candidate is easy: evaluate the polynomial and count the hits. Finding a really good one is believed to be hard for classical computers at these sizes. Easy to check, hard to find: that's what makes it a candidate for verifiable quantum advantage.

Everything happens in a finite field. Here, G F two to the twelve, which has four thousand and ninety six elements. Each element is a twelve-bit string, thought of as a polynomial in a symbol alpha, with bits as coefficients.

Adding two elements is just XOR, bit by bit, with no carries. In a circuit, that's CNOT gates. Free.

Multiplication is polynomial multiplication, then reduction by a fixed degree-twelve polynomial. Multiplying by a known constant is linear, so it's also just CNOTs. Multiplying two quantum registers costs Toffolis: sixty three in the reference circuit's Karatsuba multiplier. And inversion, one over a, is the expensive one: three hundred and fifteen Toffolis, using the Itoh Tsujii method.

Now, Reed Solomon codes. They're used everywhere, from QR codes to deep-space probes. Take a message, treat it as the coefficients of a low-degree polynomial, and store the polynomial's values at many points. A low-degree polynomial is pinned down by just a few of its values, so the extra values are redundancy.

If a few stored values get corrupted, the redundancy lets you find and fix them.

The tool for that is the syndrome: a short fingerprint of the error, computed from the received word by a fixed linear map. It's zero exactly when there are no errors, and different small error patterns give different syndromes. Decoding means: given the syndrome, work out the error.

Here's D Q I's big idea, at a high level. The quantum Fourier transform turns the optimization problem into a decoding problem. D Q I prepares a superposition of sparse error patterns e, and computes their syndromes.

Then it must erase e, keeping only the syndrome. But erasing e without looking at it means computing e from its syndrome. That's decoding: done reversibly, in superposition. Finally, a Fourier transform produces a state whose measurement gives good polynomials. The decoder is by far the most expensive part, so it's the benchmark.

There's a twist. The improved construction erases the error symbols one at a time, by measurement: our old friend, measurement-based uncomputation. Each measurement leaves behind a sign: minus one to the c dot e, where c is the random record of measurement outcomes. Those signs must be cancelled before the final Fourier transform. And cancelling them still requires knowing e, which means decoding.

So here's the benchmark. Your circuit receives a syndrome s in eight hundred and forty qubits, and a classical record c of about forty nine thousand bits. It must apply the sign, minus one to the c dot e of s, where e of s is the unique error of weight at most thirty five with that syndrome. It must leave s unchanged, and return all workspace to zero. The error itself is never given to you. Your circuit has to find it.

The numbers: four thousand and ninety five positions, seventy syndrome symbols, the field G F two to the twelve, and up to thirty five errors. The code has minimum distance seventy one, which is why any thirty five errors give a unique syndrome.

The reference decoder has three stages. First, solve the so-called key equation with the extended Euclidean algorithm, run on polynomials. That gives two polynomials: the error locator, sigma, whose roots mark where the errors are, and the error evaluator, omega.

Second, a Chien search: evaluate sigma at all four thousand and ninety five positions. A zero marks an error. There, Forney's formula gives the error value, and Z gates, chosen by the record bits, apply the sign. Third, run the Euclidean algorithm backwards, to restore the syndrome and clean up.

The reference costs one thousand eight hundred ninety three qubits, and about five point seven million Toffolis. A lot of that goes on doing a field inversion at every one of the four thousand ninety five positions.

The cost formula is R of epsilon, times Q squared, times T. Qubits are squared, so cutting qubits by one percent is worth as much as cutting Toffolis by two percent.

R is a repetition penalty. Approximate decoders are allowed: if your decoder fails sometimes, D Q I just has to be run more times. The verifier tests one hundred and two thousand four hundred syndromes, with errors drawn the way D Q I would actually produce them, and turns the failure count into a certified bound epsilon plus.

Even a perfect decoder pays R of about one point one nine, because a hundred thousand shots can't certify anything better. One percent failures nearly doubles the cost. And failing more than one time in sixteen gets no score at all.

Where are the points? Public notebooks report around eight hundred and eighty qubits and under a million Toffolis. That's roughly twenty seven times cheaper than the reference, and the leaders are higher still.

The ideas: work almost entirely in place, reusing the eight hundred and forty syndrome qubits as workspace. Do fewer field inversions, by sharing them, batching them, or avoiding them. Use cheaper multipliers and smarter bookkeeping for the polynomials. And design for the typical case: most error patterns have fewer than thirty five errors, and rare failures are allowed, as long as R stays small.


## 9. Benchmark III: FeMoCo lookups and rotations  (37:58)

Benchmark three is quantum chemistry. The target is FeMoCo, the iron molybdenum cofactor at the heart of nitrogenase. That's the enzyme bacteria use to turn nitrogen from the air into ammonia, at room temperature. Industry does the same job with the Haber Bosch process, which consumes something like one to two percent of the world's energy. Understanding FeMoCo is one of the famous goals for quantum computers.

We want its ground state energy. The model uses seventy six orbitals, and one hundred and thirteen electrons. The Hamiltonian is defined by one-body integrals, with about six thousand numbers, and two-body integrals, with seventy six to the fourth: about thirty three million numbers.

Energies are estimated with quantum phase estimation, applied to a block encoding of H. That's a unitary circuit that holds H, divided by a normalization lambda, in one corner of a bigger matrix. The algorithm calls this circuit a number of times proportional to lambda over the accuracy you want. So a smaller lambda means a faster algorithm, and a cheaper circuit means each call costs less.

The standard construction is a linear combination of unitaries. Write H as a weighted sum of simple pieces. Prepare a state whose amplitudes are the square roots of the weights. Apply the piece chosen by the index. Then unprepare. Lambda is the sum of the weights.

Feeding thirty three million numbers into a circuit would be hopeless. So the two-body tensor is compressed with a tensor factorization. You choose R groups, each with B unit vectors u, in seventy six dimensions, plus C sets of weights per group. The tensor is rebuilt from sums of products of these vectors.

The factorization must reproduce the true integrals to within twenty milli-hartree, measured in the Frobenius norm. The provided baseline uses sixty five groups, sixty vectors each, and sixty weight copies. This part should feel familiar to an A I engineer: it's fitting a low-rank model to a big tensor, with gradient descent, under constraints.

Now, how does the circuit use a unit vector? Through Givens rotations, arranged on a tree. Picture a tree over the orbitals, here just eight of them. Start with all of the vector's weight on orbital zero.

Each edge of the tree is a rotation by an angle theta, that moves some of the weight from the parent to the child. The child gets the parent's value times sine theta, and the parent keeps cosine theta.

Seventy six orbitals means seventy five edges, so seventy five angles, and with them you can reach any unit vector. On the quantum side, each edge becomes a fermionic Givens rotation, controlled by the bits of its angle.

And this is the circuit you actually build: the angle loader. Given the address of a vector in a selection register, it writes that vector's angles into word registers. It's a lookup table, a QROM. With the baseline factorization, there are seventy six plus R times B entries: three thousand nine hundred seventy six vectors, with seventy five angles each, every angle a twelve-bit word.

The seventy five angles are streamed in batches of J words. Circuit k XORs in the difference between batch k and batch k minus one. So the same J registers step from batch to batch in place, and running the family backwards clears them. Each of these circuits may use at most one hundred and twenty eight qubits.

The score is lambda effective, times total Toffolis, times total qubits. The Toffoli count includes your angle circuits, run forward and backward, plus formula-based costs for the parts you don't build: the state preparations, and the Givens rotations, whose cost grows with the number of angle bits. Total qubits counts the persistent registers, the word registers, and the largest temporary workspace.

Lambda effective comes from a trick called spectrum amplification. It combines the raw normalization, capital lambda, with an energy gap that measures how far the factorization's sum-of-squares lower bound sits below the true ground state energy. Smaller is better. And to stop degenerate factorizations from gaming it, capital lambda must stay above forty nine, and the gap above three point nine one hartree.

The baseline: lambda effective forty nine point three, about ninety three thousand Toffolis, seven hundred thirty qubits. A score of about three point three six billion.

A public notebook already does about four times better, mostly by changing the factorization: a single group of four hundred ninety six vectors. That's only five hundred seventy two lookup entries instead of almost four thousand, and the Toffoli count drops from ninety three thousand to about twenty thousand.

So this task has levers on both sides. Classically: fewer vectors, a smaller lambda effective, fewer angle bits, all while keeping the error under twenty milli-hartree. On the quantum side: cheaper lookups, since a lookup's cost scales with the number of entries. The batch size, the tree shape, and the word layout are yours to choose too.

Of the three benchmarks, this one rewards an A I engineer's skills most directly: a constrained, non-convex fitting problem, with a cost model you can optimize against.


## 10. Scoring, submitting, and a plan  (43:39)

Let's put it all together. Three tasks, three cost formulas. Benchmark one: qubits times Toffolis plus T gates over four. Benchmark two: the repetition penalty, times qubits squared, times Toffolis. Benchmark three: lambda effective, times total Toffolis, times total qubits.

Your score is the geometric mean of the three improvement ratios. Since it's a geometric mean, a task you leave at the reference contributes a factor of one, and doubling any single ratio raises your score by the same amount, about twenty six percent.

A submission is a zip file with your circuits: one binary kickmix file for benchmark one, one for benchmark two, and a folder for benchmark three, with the angle circuits and the factorization. It mirrors the sample submission folder that ships with the competition data. Check the competition's evaluation page for the exact rules; you only get a few submissions per day.

The competition data gives you everything you need: kickmix itself, the three official verifiers with their source code, the reference circuit generators, the FeMoCo integrals, a sample submission, and the companion paper. Your very first step: run the verifiers on the sample submission yourself, and confirm it scores exactly one.

Then the workflow is a loop. Write a Python program that generates your circuit with kickmix's builder. Build it. Verify it locally with the official verifier. Read the cost breakdown, kickmix even draws flame charts of where your Toffolis and qubits go. Change one idea. Repeat.

And this is exactly the loop the organizers designed for A I coding agents: propose a change, build, verify, score, keep the best, and repeat, many times over. The organizers ran their own agents, published the SHA-256 hashes of their best circuits as a commitment, and say that all three benchmarks can still be improved. Evolutionary search with coding agents, in the style of AlphaEvolve, is a natural fit.

Here's a concrete plan for your first two weeks. One: verify the sample submission, and read the source code of the three verifiers. Two: build tiny circuits in kickmix: a temporary AND, an adder, a small lookup. Simulate them. Break them on purpose, and watch the verifier catch it.

Three: start with benchmark one. It has a single register, every input is tested, and you can model the arithmetic in NumPy. Four: try benchmark three next. The factorization is a fitting problem, right in an A I engineer's comfort zone. Five: leave benchmark two for last. It rewards depth in finite fields and coding theory. And six: read the public notebooks, and reproduce one before you try to beat it.

And a reading list. First, the competition paper itself: now you can read it. Then Craig Gidney's paper on halving the cost of quantum addition. Babbush and coauthors on encoding electronic spectra with linear T complexity, which introduced the lookup and unary iteration constructions. Low, Kliuchnikov and Schaeffer on select-swap lookups. The original decoded quantum interferometry paper. And, for the basics, Nielsen and Chuang.

Remember the words from the start of this video? Toffoli. Uncomputation. Hammer. Q-rom. Syndrome. Block encoding. They should all mean something now.

So: could we get more from a quantum computer, by asking it to do less? Every Toffoli you remove, and every qubit you save, is a little less work for a future quantum computer, and brings useful quantum computing a little closer. Good luck.
