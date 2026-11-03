# Native visual validation launch retry

Attempt 1 of [run 41566012936](https://github.com/pspina3rd/TheRealm/actions/runs/41566012936),
job `125687607523`, completed nine UI tests with one failure. The campaign flow
passed; the visual gallery completed its captures. The failed test was
`testNativeBoardGesturesAndBackgroundRecovery`, at its initial `app.launch()`
call, before any board gesture assertions executed.

## Recorded evidence

The supplied `NativePlaytest.xcresult` was inspected without changing product or
test code. Its diagnostic directory references were decoded and 467 diagnostic
files inventoried. Relevant records are the test runner's
`StandardOutputAndStandardError.txt`, `Session-…log`, and the application's
`StandardOutputAndStandardError-com.pspina3rd.ManaCrystalsPlaytest.txt`.
The following timestamps are UTC on 2026-11-03:

- At 02:38:32, the test requested a launch with `--battle-playtest`. XCTest first
  terminated the previous campaign process, PID `19985`, as requested.
- At 02:38:42.252, Xcode verified the new application process, PID `20240`, with
  `kill(pid, 0) = 0`: the process was running.
- At 02:38:42.751, XCTest logged “Xcode confirmed launch completion,” but then
  tracked launch token `3` as an application with `pid:0`.
- At 02:38:45.773, application output from PID `20240` recorded normal
  `NativeBoardView` initialization. At 02:38:46.981, the runner received an
  accessibility `ViewDidAppear` notification from that PID for
  `ManaCrystalsPlaytest.BattleViewController`.
- At 02:39:42.884, XCTest timed out waiting for its tracked `pid:0` to satisfy
  `isProcessIDValid`. The test reported “Application … does not have a process
  ID”; it did not reach its first gesture.
- At 02:40:18.831, after the test had failed, the runner finally associated the
  same application object with PID `20240` and reported it running foreground.
  The following visual test's launch used `terminate_running_process = 1`;
  PID `20240` then exited with signal 9 at 02:40:25.988 as it was replaced.

No `.crash`, `.ips`, Jetsam or DiagnosticReports entries were present in the
supplied diagnostic file inventory. Application output contained no fatal
exception or application crash signature. The repeated duplicate accessibility
class warning also appeared in successful launches; it is not a crash report.

## Assessment and retry

The evidence supports an XCTest/simulator process-registration failure: the app
was alive and its actual battle controller had appeared while XCTest waited on
an invalid tracked PID. This attempt does not establish that the gesture checks
passed, and absence of a bundled crash report alone would not prove that claim.

Root started an unchanged retry of the same run, current job `125695522058`.
No application behavior, assertions or time limits were changed to hide the
failure. The retry must complete the gesture assertions before validation is
considered complete.


## Retry result

[Attempt 2](https://github.com/pspina3rd/TheRealm/actions/runs/41566012936/attempts/2),
job `125695522058`, passed on the same product source. The original gesture UI
test completed its board actions and background/resume checks. All nine UI tests
passed, including the campaign flow and all 111 visual gallery cases, alongside
26 native engine/gesture unit checks. No assertion, timeout or app behavior was
changed for this retry. This closes the pending launch/gesture validation item;
the first attempt remains recorded as a failure rather than retroactively waived.
