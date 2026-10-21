/* @ds-bundle: {"format":4,"namespace":"TeddySteps","components":[{"name":"Wordmark"},{"name":"Monogram"},{"name":"Character"},{"name":"Hug"},{"name":"Doodle"},{"name":"Icon"},{"name":"Button"},{"name":"IconButton"},{"name":"ChoiceChip"},{"name":"Switch"},{"name":"TextField"},{"name":"CodeInput"},{"name":"ScreenHeader"},{"name":"StepProgress"},{"name":"TabBar"},{"name":"Sticker"},{"name":"MomentCard"},{"name":"RangeBar"},{"name":"ListRow"},{"name":"PersonRow"},{"name":"Avatar"},{"name":"Callout"},{"name":"EmptySlot"},{"name":"BookCover"},{"name":"VoiceNote"},{"name":"HandNote"},{"name":"HugToast"},{"name":"Banner"},{"name":"Scallop"},{"name":"LeapTimeline"},{"name":"NextUp"}]} */
(function () {
  var R = window.React, h = R.createElement;
  var D = {"chars": {"bo": {"name": "Bo the bear", "motion": "bob", "default": "<ellipse cx=\"30\" cy=\"148\" rx=\"12\" ry=\"18\" fill=\"#B66C3A\" transform=\"rotate(25 30 148)\"/><ellipse cx=\"176\" cy=\"102\" rx=\"12\" ry=\"19\" fill=\"#B66C3A\" transform=\"rotate(-38 176 102)\"/><ellipse cx=\"76\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#B66C3A\"/><ellipse cx=\"124\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#B66C3A\"/><circle cx=\"56\" cy=\"56\" r=\"26\" fill=\"#D98E55\"/><circle cx=\"144\" cy=\"56\" r=\"26\" fill=\"#D98E55\"/><circle cx=\"56\" cy=\"56\" r=\"13\" fill=\"#FF6B8E\" opacity=\"0.5\"/><circle cx=\"144\" cy=\"56\" r=\"13\" fill=\"#FF6B8E\" opacity=\"0.5\"/><path d=\"M100 40 C 150 40, 176 76, 176 120 C 176 162, 142 184, 100 184 C 58 184, 24 162, 24 120 C 24 76, 50 40, 100 40 Z\" fill=\"#D98E55\"/><ellipse cx=\"100\" cy=\"140\" rx=\"32\" ry=\"24\" fill=\"#F8EAD4\"/><ellipse cx=\"56\" cy=\"134\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><ellipse cx=\"144\" cy=\"134\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><circle cx=\"76\" cy=\"108\" r=\"5.6\" fill=\"#2D1E2F\"/><circle cx=\"124\" cy=\"108\" r=\"5.6\" fill=\"#2D1E2F\"/><circle cx=\"77.8\" cy=\"106.2\" r=\"1.8\" fill=\"#FFFFFF\"/><circle cx=\"125.8\" cy=\"106.2\" r=\"1.8\" fill=\"#FFFFFF\"/><ellipse cx=\"100\" cy=\"129\" rx=\"10\" ry=\"7\" fill=\"#2D1E2F\"/><path d=\"M100 135 V140 M90 143 q10 8 20 0\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.2\" stroke-linecap=\"round\"/>", "happy": "<ellipse cx=\"30\" cy=\"148\" rx=\"12\" ry=\"18\" fill=\"#B66C3A\" transform=\"rotate(25 30 148)\"/><ellipse cx=\"176\" cy=\"102\" rx=\"12\" ry=\"19\" fill=\"#B66C3A\" transform=\"rotate(-38 176 102)\"/><ellipse cx=\"76\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#B66C3A\"/><ellipse cx=\"124\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#B66C3A\"/><circle cx=\"56\" cy=\"56\" r=\"26\" fill=\"#D98E55\"/><circle cx=\"144\" cy=\"56\" r=\"26\" fill=\"#D98E55\"/><circle cx=\"56\" cy=\"56\" r=\"13\" fill=\"#FF6B8E\" opacity=\"0.5\"/><circle cx=\"144\" cy=\"56\" r=\"13\" fill=\"#FF6B8E\" opacity=\"0.5\"/><path d=\"M100 40 C 150 40, 176 76, 176 120 C 176 162, 142 184, 100 184 C 58 184, 24 162, 24 120 C 24 76, 50 40, 100 40 Z\" fill=\"#D98E55\"/><ellipse cx=\"100\" cy=\"140\" rx=\"32\" ry=\"24\" fill=\"#F8EAD4\"/><ellipse cx=\"56\" cy=\"134\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><ellipse cx=\"144\" cy=\"134\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><path d=\"M69 111 q7 -10 14 0 M117 111 q7 -10 14 0\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.8\" stroke-linecap=\"round\"/><ellipse cx=\"100\" cy=\"129\" rx=\"10\" ry=\"7\" fill=\"#2D1E2F\"/><path d=\"M100 135 V140 M90 143 q10 8 20 0\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.2\" stroke-linecap=\"round\"/>"}, "tiggy": {"name": "Tiggy the tiger", "motion": "sway", "default": "<ellipse cx=\"30\" cy=\"148\" rx=\"12\" ry=\"18\" fill=\"#C9561E\" transform=\"rotate(25 30 148)\"/><ellipse cx=\"176\" cy=\"102\" rx=\"12\" ry=\"19\" fill=\"#C9561E\" transform=\"rotate(-38 176 102)\"/><ellipse cx=\"76\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#C9561E\"/><ellipse cx=\"124\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#C9561E\"/><path d=\"M42 80 C 34 46, 42 26, 52 20 C 68 26, 84 40, 90 52 Z\" fill=\"#F2762E\"/><path d=\"M158 80 C 166 46, 158 26, 148 20 C 132 26, 116 40, 110 52 Z\" fill=\"#F2762E\"/><path d=\"M54 66 C 50 48, 54 38, 58 34 C 66 38, 74 44, 78 50 Z\" fill=\"#F8EAD4\"/><path d=\"M146 66 C 150 48, 146 38, 142 34 C 134 38, 126 44, 122 50 Z\" fill=\"#F8EAD4\"/><path d=\"M100 40 C 150 40, 176 76, 176 120 C 176 162, 142 184, 100 184 C 58 184, 24 162, 24 120 C 24 76, 50 40, 100 40 Z\" fill=\"#F2762E\"/><path d=\"M100 46 L100 64 M84 50 L88 62 M116 50 L112 62 M27 110 L47 117 M28 132 L47 132 M173 110 L153 117 M172 132 L153 132\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"7\" stroke-linecap=\"round\"/><ellipse cx=\"88\" cy=\"142\" rx=\"20\" ry=\"16\" fill=\"#F8EAD4\"/><ellipse cx=\"112\" cy=\"142\" rx=\"20\" ry=\"16\" fill=\"#F8EAD4\"/><circle cx=\"80\" cy=\"140\" r=\"2.2\" fill=\"#2D1E2F\"/><circle cx=\"88\" cy=\"147\" r=\"2.2\" fill=\"#2D1E2F\"/><circle cx=\"112\" cy=\"147\" r=\"2.2\" fill=\"#2D1E2F\"/><circle cx=\"120\" cy=\"140\" r=\"2.2\" fill=\"#2D1E2F\"/><ellipse cx=\"54\" cy=\"130\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><ellipse cx=\"146\" cy=\"130\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><circle cx=\"74\" cy=\"106\" r=\"5.6\" fill=\"#2D1E2F\"/><circle cx=\"126\" cy=\"106\" r=\"5.6\" fill=\"#2D1E2F\"/><circle cx=\"75.8\" cy=\"104.2\" r=\"1.8\" fill=\"#FFFFFF\"/><circle cx=\"127.8\" cy=\"104.2\" r=\"1.8\" fill=\"#FFFFFF\"/><path d=\"M90 127 Q100 122 110 127 Q105 137 100 137 Q95 137 90 127 Z\" fill=\"#FF6B8E\"/><path d=\"M100 137 V141\" stroke=\"#2D1E2F\" stroke-width=\"3\" stroke-linecap=\"round\"/>", "happy": "<ellipse cx=\"30\" cy=\"148\" rx=\"12\" ry=\"18\" fill=\"#C9561E\" transform=\"rotate(25 30 148)\"/><ellipse cx=\"176\" cy=\"102\" rx=\"12\" ry=\"19\" fill=\"#C9561E\" transform=\"rotate(-38 176 102)\"/><ellipse cx=\"76\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#C9561E\"/><ellipse cx=\"124\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#C9561E\"/><path d=\"M42 80 C 34 46, 42 26, 52 20 C 68 26, 84 40, 90 52 Z\" fill=\"#F2762E\"/><path d=\"M158 80 C 166 46, 158 26, 148 20 C 132 26, 116 40, 110 52 Z\" fill=\"#F2762E\"/><path d=\"M54 66 C 50 48, 54 38, 58 34 C 66 38, 74 44, 78 50 Z\" fill=\"#F8EAD4\"/><path d=\"M146 66 C 150 48, 146 38, 142 34 C 134 38, 126 44, 122 50 Z\" fill=\"#F8EAD4\"/><path d=\"M100 40 C 150 40, 176 76, 176 120 C 176 162, 142 184, 100 184 C 58 184, 24 162, 24 120 C 24 76, 50 40, 100 40 Z\" fill=\"#F2762E\"/><path d=\"M100 46 L100 64 M84 50 L88 62 M116 50 L112 62 M27 110 L47 117 M28 132 L47 132 M173 110 L153 117 M172 132 L153 132\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"7\" stroke-linecap=\"round\"/><ellipse cx=\"88\" cy=\"142\" rx=\"20\" ry=\"16\" fill=\"#F8EAD4\"/><ellipse cx=\"112\" cy=\"142\" rx=\"20\" ry=\"16\" fill=\"#F8EAD4\"/><circle cx=\"80\" cy=\"140\" r=\"2.2\" fill=\"#2D1E2F\"/><circle cx=\"88\" cy=\"147\" r=\"2.2\" fill=\"#2D1E2F\"/><circle cx=\"112\" cy=\"147\" r=\"2.2\" fill=\"#2D1E2F\"/><circle cx=\"120\" cy=\"140\" r=\"2.2\" fill=\"#2D1E2F\"/><ellipse cx=\"54\" cy=\"130\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><ellipse cx=\"146\" cy=\"130\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><path d=\"M67 109 q7 -10 14 0 M119 109 q7 -10 14 0\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.8\" stroke-linecap=\"round\"/><path d=\"M90 127 Q100 122 110 127 Q105 137 100 137 Q95 137 90 127 Z\" fill=\"#FF6B8E\"/><path d=\"M100 137 V141\" stroke=\"#2D1E2F\" stroke-width=\"3\" stroke-linecap=\"round\"/>", "still": "<ellipse cx=\"30\" cy=\"148\" rx=\"12\" ry=\"18\" fill=\"#C9561E\" transform=\"rotate(25 30 148)\"/><ellipse cx=\"170\" cy=\"148\" rx=\"12\" ry=\"18\" fill=\"#C9561E\" transform=\"rotate(-25 170 148)\"/><ellipse cx=\"76\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#C9561E\"/><ellipse cx=\"124\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#C9561E\"/><path d=\"M42 80 C 34 46, 42 26, 52 20 C 68 26, 84 40, 90 52 Z\" fill=\"#F2762E\"/><path d=\"M158 80 C 166 46, 158 26, 148 20 C 132 26, 116 40, 110 52 Z\" fill=\"#F2762E\"/><path d=\"M54 66 C 50 48, 54 38, 58 34 C 66 38, 74 44, 78 50 Z\" fill=\"#F8EAD4\"/><path d=\"M146 66 C 150 48, 146 38, 142 34 C 134 38, 126 44, 122 50 Z\" fill=\"#F8EAD4\"/><path d=\"M100 40 C 150 40, 176 76, 176 120 C 176 162, 142 184, 100 184 C 58 184, 24 162, 24 120 C 24 76, 50 40, 100 40 Z\" fill=\"#F2762E\"/><path d=\"M100 46 L100 64 M84 50 L88 62 M116 50 L112 62 M27 110 L47 117 M28 132 L47 132 M173 110 L153 117 M172 132 L153 132\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"7\" stroke-linecap=\"round\"/><ellipse cx=\"88\" cy=\"142\" rx=\"20\" ry=\"16\" fill=\"#F8EAD4\"/><ellipse cx=\"112\" cy=\"142\" rx=\"20\" ry=\"16\" fill=\"#F8EAD4\"/><circle cx=\"80\" cy=\"140\" r=\"2.2\" fill=\"#2D1E2F\"/><circle cx=\"88\" cy=\"147\" r=\"2.2\" fill=\"#2D1E2F\"/><circle cx=\"112\" cy=\"147\" r=\"2.2\" fill=\"#2D1E2F\"/><circle cx=\"120\" cy=\"140\" r=\"2.2\" fill=\"#2D1E2F\"/><ellipse cx=\"54\" cy=\"130\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><ellipse cx=\"146\" cy=\"130\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><circle cx=\"74\" cy=\"106\" r=\"5.6\" fill=\"#2D1E2F\"/><circle cx=\"126\" cy=\"106\" r=\"5.6\" fill=\"#2D1E2F\"/><circle cx=\"75.8\" cy=\"104.2\" r=\"1.8\" fill=\"#FFFFFF\"/><circle cx=\"127.8\" cy=\"104.2\" r=\"1.8\" fill=\"#FFFFFF\"/><path d=\"M90 127 Q100 122 110 127 Q105 137 100 137 Q95 137 90 127 Z\" fill=\"#FF6B8E\"/><path d=\"M100 137 V141\" stroke=\"#2D1E2F\" stroke-width=\"3\" stroke-linecap=\"round\"/>"}, "bizzy": {"name": "Bizzy the bee", "motion": "drift", "default": "<ellipse cx=\"82\" cy=\"54\" rx=\"24\" ry=\"17\" fill=\"#FFFFFF\" fill-opacity=\"0.9\" stroke=\"#2D1E2F\" stroke-width=\"2.6\" transform=\"rotate(-25 82 54)\"/><ellipse cx=\"122\" cy=\"50\" rx=\"22\" ry=\"16\" fill=\"#FFFFFF\" fill-opacity=\"0.9\" stroke=\"#2D1E2F\" stroke-width=\"2.6\" transform=\"rotate(20 122 50)\"/><path d=\"M78 70 Q 68 42 58 38 M108 66 Q 110 38 126 30\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.4\" stroke-linecap=\"round\"/><circle cx=\"56\" cy=\"37\" r=\"5.5\" fill=\"#2D1E2F\"/><circle cx=\"128\" cy=\"29\" r=\"5.5\" fill=\"#2D1E2F\"/><ellipse cx=\"80\" cy=\"182\" rx=\"12\" ry=\"7\" fill=\"#2D1E2F\"/><ellipse cx=\"118\" cy=\"182\" rx=\"12\" ry=\"7\" fill=\"#2D1E2F\"/><path d=\"M170 114 L 192 122 L 170 130 Z\" fill=\"#2D1E2F\" stroke=\"#2D1E2F\" stroke-width=\"3\" stroke-linejoin=\"round\"/><clipPath id=\"__CLIP__\"><ellipse cx=\"100\" cy=\"122\" rx=\"74\" ry=\"62\"/></clipPath><ellipse cx=\"100\" cy=\"122\" rx=\"74\" ry=\"62\" fill=\"#FFD84D\"/><g clip-path=\"url(#__CLIP__)\" fill=\"#2D1E2F\"><rect x=\"116\" y=\"50\" width=\"14\" height=\"150\" rx=\"7\"/><rect x=\"141\" y=\"50\" width=\"14\" height=\"150\" rx=\"7\"/><rect x=\"166\" y=\"50\" width=\"14\" height=\"150\" rx=\"7\"/></g><ellipse cx=\"46\" cy=\"132\" rx=\"9.9\" ry=\"7.7\" fill=\"#FF6B8E\" opacity=\"0.62\"/><ellipse cx=\"98\" cy=\"132\" rx=\"9.9\" ry=\"7.7\" fill=\"#FF6B8E\" opacity=\"0.62\"/><circle cx=\"58\" cy=\"114\" r=\"5.3\" fill=\"#2D1E2F\"/><circle cx=\"86\" cy=\"114\" r=\"5.3\" fill=\"#2D1E2F\"/><circle cx=\"59.7\" cy=\"112.3\" r=\"1.7\" fill=\"#FFFFFF\"/><circle cx=\"87.7\" cy=\"112.3\" r=\"1.7\" fill=\"#FFFFFF\"/><path d=\"M65.7 124 q6.3 6.3 12.6 0\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.1\" stroke-linecap=\"round\"/>", "happy": "<ellipse cx=\"82\" cy=\"54\" rx=\"24\" ry=\"17\" fill=\"#FFFFFF\" fill-opacity=\"0.9\" stroke=\"#2D1E2F\" stroke-width=\"2.6\" transform=\"rotate(-25 82 54)\"/><ellipse cx=\"122\" cy=\"50\" rx=\"22\" ry=\"16\" fill=\"#FFFFFF\" fill-opacity=\"0.9\" stroke=\"#2D1E2F\" stroke-width=\"2.6\" transform=\"rotate(20 122 50)\"/><path d=\"M78 70 Q 68 42 58 38 M108 66 Q 110 38 126 30\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.4\" stroke-linecap=\"round\"/><circle cx=\"56\" cy=\"37\" r=\"5.5\" fill=\"#2D1E2F\"/><circle cx=\"128\" cy=\"29\" r=\"5.5\" fill=\"#2D1E2F\"/><ellipse cx=\"80\" cy=\"182\" rx=\"12\" ry=\"7\" fill=\"#2D1E2F\"/><ellipse cx=\"118\" cy=\"182\" rx=\"12\" ry=\"7\" fill=\"#2D1E2F\"/><path d=\"M170 114 L 192 122 L 170 130 Z\" fill=\"#2D1E2F\" stroke=\"#2D1E2F\" stroke-width=\"3\" stroke-linejoin=\"round\"/><clipPath id=\"__CLIP__\"><ellipse cx=\"100\" cy=\"122\" rx=\"74\" ry=\"62\"/></clipPath><ellipse cx=\"100\" cy=\"122\" rx=\"74\" ry=\"62\" fill=\"#FFD84D\"/><g clip-path=\"url(#__CLIP__)\" fill=\"#2D1E2F\"><rect x=\"116\" y=\"50\" width=\"14\" height=\"150\" rx=\"7\"/><rect x=\"141\" y=\"50\" width=\"14\" height=\"150\" rx=\"7\"/><rect x=\"166\" y=\"50\" width=\"14\" height=\"150\" rx=\"7\"/></g><ellipse cx=\"46\" cy=\"132\" rx=\"9.9\" ry=\"7.7\" fill=\"#FF6B8E\" opacity=\"0.62\"/><ellipse cx=\"98\" cy=\"132\" rx=\"9.9\" ry=\"7.7\" fill=\"#FF6B8E\" opacity=\"0.62\"/><path d=\"M52.7 116.7 q5.3 -8 10.6 0 M80.7 116.7 q5.3 -8 10.6 0\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.4\" stroke-linecap=\"round\"/><path d=\"M65.7 124 q6.3 6.3 12.6 0\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.1\" stroke-linecap=\"round\"/>"}, "puddle": {"name": "Puddle the duck", "motion": "hop", "default": "<path d=\"M84 174 L 68 190 L 100 190 Z M122 174 L 108 190 L 140 190 Z\" fill=\"#F2762E\" stroke=\"#F2762E\" stroke-width=\"5\" stroke-linejoin=\"round\"/><path d=\"M160 126 C 176 114, 186 100, 192 92 C 194 114, 186 138, 168 148 Z\" fill=\"#7393E6\"/><ellipse cx=\"108\" cy=\"140\" rx=\"66\" ry=\"44\" fill=\"#7393E6\"/><circle cx=\"86\" cy=\"80\" r=\"42\" fill=\"#7393E6\"/><path d=\"M100 136 C 116 118, 150 118, 158 136 C 148 154, 116 158, 100 136 Z\" fill=\"#5878D0\"/><path d=\"M84 40 C 82 28, 90 22, 96 26 M90 40 C 96 30, 106 30, 106 36\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M50 84 C 34 80, 18 86, 20 95 C 22 104, 42 106, 54 98 Z\" fill=\"#F2762E\"/><path d=\"M24 95 Q 38 98 52 94\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"2.4\" stroke-linecap=\"round\"/><ellipse cx=\"66\" cy=\"96\" rx=\"9.9\" ry=\"7.7\" fill=\"#FF6B8E\" opacity=\"0.62\"/><ellipse cx=\"114\" cy=\"92\" rx=\"9.9\" ry=\"7.7\" fill=\"#FF6B8E\" opacity=\"0.62\"/><circle cx=\"72\" cy=\"74\" r=\"5.0\" fill=\"#2D1E2F\"/><circle cx=\"104\" cy=\"72\" r=\"5.0\" fill=\"#2D1E2F\"/><circle cx=\"73.6\" cy=\"72.4\" r=\"1.6\" fill=\"#FFFFFF\"/><circle cx=\"105.6\" cy=\"70.4\" r=\"1.6\" fill=\"#FFFFFF\"/>", "happy": "<path d=\"M84 174 L 68 190 L 100 190 Z M122 174 L 108 190 L 140 190 Z\" fill=\"#F2762E\" stroke=\"#F2762E\" stroke-width=\"5\" stroke-linejoin=\"round\"/><path d=\"M160 126 C 176 114, 186 100, 192 92 C 194 114, 186 138, 168 148 Z\" fill=\"#7393E6\"/><ellipse cx=\"108\" cy=\"140\" rx=\"66\" ry=\"44\" fill=\"#7393E6\"/><circle cx=\"86\" cy=\"80\" r=\"42\" fill=\"#7393E6\"/><path d=\"M100 136 C 116 118, 150 118, 158 136 C 148 154, 116 158, 100 136 Z\" fill=\"#5878D0\"/><path d=\"M84 40 C 82 28, 90 22, 96 26 M90 40 C 96 30, 106 30, 106 36\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M50 84 C 34 80, 18 86, 20 95 C 22 104, 42 106, 54 98 Z\" fill=\"#F2762E\"/><path d=\"M24 95 Q 38 98 52 94\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"2.4\" stroke-linecap=\"round\"/><ellipse cx=\"66\" cy=\"96\" rx=\"9.9\" ry=\"7.7\" fill=\"#FF6B8E\" opacity=\"0.62\"/><ellipse cx=\"114\" cy=\"92\" rx=\"9.9\" ry=\"7.7\" fill=\"#FF6B8E\" opacity=\"0.62\"/><path d=\"M65.7 76.7 q6.3 -9.0 12.6 0 M97.7 74.7 q6.3 -9.0 12.6 0\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.4\" stroke-linecap=\"round\"/>"}}, "hug": "<g transform=\"translate(0 14) rotate(0 100 100) scale(1)\"><g><g filter=\"url(#__F__)\"><ellipse cx=\"30\" cy=\"148\" rx=\"12\" ry=\"18\" fill=\"#B66C3A\" transform=\"rotate(25 30 148)\"/><ellipse cx=\"170\" cy=\"148\" rx=\"12\" ry=\"18\" fill=\"#B66C3A\" transform=\"rotate(-25 170 148)\"/><ellipse cx=\"76\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#B66C3A\"/><ellipse cx=\"124\" cy=\"186\" rx=\"18\" ry=\"10\" fill=\"#B66C3A\"/><circle cx=\"56\" cy=\"56\" r=\"26\" fill=\"#D98E55\"/><circle cx=\"144\" cy=\"56\" r=\"26\" fill=\"#D98E55\"/><circle cx=\"56\" cy=\"56\" r=\"13\" fill=\"#FF6B8E\" opacity=\"0.5\"/><circle cx=\"144\" cy=\"56\" r=\"13\" fill=\"#FF6B8E\" opacity=\"0.5\"/><path d=\"M100 40 C 150 40, 176 76, 176 120 C 176 162, 142 184, 100 184 C 58 184, 24 162, 24 120 C 24 76, 50 40, 100 40 Z\" fill=\"#D98E55\"/><ellipse cx=\"100\" cy=\"140\" rx=\"32\" ry=\"24\" fill=\"#F8EAD4\"/><ellipse cx=\"56\" cy=\"134\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><ellipse cx=\"144\" cy=\"134\" rx=\"11.0\" ry=\"8.5\" fill=\"#FF6B8E\" opacity=\"0.62\"/><circle cx=\"76\" cy=\"108\" r=\"5.6\" fill=\"#2D1E2F\"/><circle cx=\"124\" cy=\"108\" r=\"5.6\" fill=\"#2D1E2F\"/><circle cx=\"77.8\" cy=\"106.2\" r=\"1.8\" fill=\"#FFFFFF\"/><circle cx=\"125.8\" cy=\"106.2\" r=\"1.8\" fill=\"#FFFFFF\"/><ellipse cx=\"100\" cy=\"129\" rx=\"10\" ry=\"7\" fill=\"#2D1E2F\"/><path d=\"M100 135 V140 M90 143 q10 8 20 0\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.2\" stroke-linecap=\"round\"/></g></g></g><g transform=\"translate(118 86) rotate(-10 62.0 62.0) scale(0.62)\"><g><g filter=\"url(#__F__)\"><path d=\"M84 174 L 68 190 L 100 190 Z M122 174 L 108 190 L 140 190 Z\" fill=\"#F2762E\" stroke=\"#F2762E\" stroke-width=\"5\" stroke-linejoin=\"round\"/><path d=\"M160 126 C 176 114, 186 100, 192 92 C 194 114, 186 138, 168 148 Z\" fill=\"#7393E6\"/><ellipse cx=\"108\" cy=\"140\" rx=\"66\" ry=\"44\" fill=\"#7393E6\"/><circle cx=\"86\" cy=\"80\" r=\"42\" fill=\"#7393E6\"/><path d=\"M100 136 C 116 118, 150 118, 158 136 C 148 154, 116 158, 100 136 Z\" fill=\"#5878D0\"/><path d=\"M84 40 C 82 28, 90 22, 96 26 M90 40 C 96 30, 106 30, 106 36\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M50 84 C 34 80, 18 86, 20 95 C 22 104, 42 106, 54 98 Z\" fill=\"#F2762E\"/><path d=\"M24 95 Q 38 98 52 94\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"2.4\" stroke-linecap=\"round\"/><ellipse cx=\"66\" cy=\"96\" rx=\"9.9\" ry=\"7.7\" fill=\"#FF6B8E\" opacity=\"0.62\"/><ellipse cx=\"114\" cy=\"92\" rx=\"9.9\" ry=\"7.7\" fill=\"#FF6B8E\" opacity=\"0.62\"/><path d=\"M65.7 76.7 q6.3 -9.0 12.6 0 M97.7 74.7 q6.3 -9.0 12.6 0\" fill=\"none\" stroke=\"#2D1E2F\" stroke-width=\"3.4\" stroke-linecap=\"round\"/></g></g></g><g class=\"ts-tw \"><path d=\"M118 33.2 C 104.0 22, 105.4 9.4, 113.8 10.8 C 116.6 10.8, 118 13.600000000000001, 118 16.4 C 118 13.600000000000001, 120.8 9.4, 125.0 10.8 C 132.0 12.200000000000001, 130.6 23.4, 118 33.2\" fill=\"none\" stroke=\"#D2402F\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" filter=\"url(#__R__)\"/></g><g class=\"ts-tw d2\"><polygon points=\"24.0,21.0 26.4,26.7 32.6,27.2 27.9,31.3 29.3,37.3 24.0,34.0 18.7,37.3 20.1,31.3 15.4,27.2 21.6,26.7\" fill=\"none\" stroke=\"#FFD84D\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" filter=\"url(#__R__)\" style=\"fill: #FFD84D\"/></g>", "defs": "<filter id=\"__F__\" x=\"-15%\" y=\"-15%\" width=\"130%\" height=\"130%\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.03\" numOctaves=\"2\" seed=\"5\" result=\"w\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"w\" scale=\"5\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"d\"/><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"2\" seed=\"9\" result=\"n\"/><feColorMatrix in=\"n\" type=\"matrix\" values=\"0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.55 0 0 0 -0.2\" result=\"s\"/><feComposite in=\"s\" in2=\"d\" operator=\"in\" result=\"sp\"/><feMerge><feMergeNode in=\"d\"/><feMergeNode in=\"sp\"/></feMerge></filter><filter id=\"__R__\" x=\"-10%\" y=\"-10%\" width=\"120%\" height=\"120%\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"2\" seed=\"3\" result=\"t\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"t\" scale=\"2.6\" xChannelSelector=\"R\" yChannelSelector=\"G\"/></filter>", "icons": {"edit": "<path d=\"M4 20 L5 15 L16 4 L20 8 L9 19 Z\"/>", "chevron-right": "<path d=\"M9 5 L16 12 L9 19\"/>", "family": "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><circle cx=\"17\" cy=\"9\" r=\"2.5\"/><path d=\"M2 20 C 3 15, 6 13, 9 13 C 12 13, 15 15, 16 20 M15 14 C 18 14, 21 16, 22 19\"/>", "bell": "<path d=\"M6 17 V11 C 6 7, 9 5, 12 5 C 15 5, 18 7, 18 11 V17 H6 Z M10 20 H14\"/>", "lock": "<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11 V8 C 8 5, 10 3, 12 3 C 14 3, 16 5, 16 8 V11\"/>", "book": "<path d=\"M4 5 C 7 4, 10 4, 12 6 C 14 4, 17 4, 20 5 V19 C 17 18, 14 18, 12 20 C 10 18, 7 18, 4 19 Z M12 6 V20\"/>", "gift": "<rect x=\"4\" y=\"10\" width=\"16\" height=\"10\" rx=\"1.5\"/><path d=\"M3 7 H21 V10 H3 Z M12 7 V20 M12 7 C 9 3, 5 5, 8 7 M12 7 C 15 3, 19 5, 16 7\"/>", "help": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9.5 C 9.5 7, 14.5 7, 14.5 9.5 C 14.5 11.5, 12 11.5, 12 14 M12 17 V17.5\"/>", "trail": "<path d=\"M5 20 C 5 15, 18 16, 17 11 C 16 7, 7 9, 8 4\" stroke-dasharray=\"1 4\"/><circle cx=\"8\" cy=\"4\" r=\"1.5\"/>", "plus": "<path d=\"M12 5 V19 M5 12 H19\"/>", "me": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21 C 5 16, 8 14, 12 14 C 16 14, 19 16, 20 21\"/>", "back": "<path d=\"M15 5 L8 12 L15 19\"/>", "download": "<path d=\"M12 4 V15 M7 10 L12 15 L17 10 M5 19 H19\"/>", "pause": "<path d=\"M9 5 V19 M15 5 V19\"/>", "trash": "<path d=\"M5 7 H19 M10 7 V4 H14 V7 M7 7 L8 20 H16 L17 7\"/>", "check": "<path d=\"M5 12 L10 17 L19 7\"/>", "close": "<path d=\"M6 6 L18 18 M18 6 L6 18\"/>", "share": "<path d=\"M12 15 V4 M7 9 L12 4 L17 9 M5 13 V19 H19 V13\"/>", "apple": "<path d=\"M15 3 C 13 3.5, 12 5, 12 7 M12 8 C 9 6.5, 5 8, 5 13 C 5 17, 8 21, 10 21 C 11 21, 11.5 20.5, 12 20.5 C 12.5 20.5, 13 21, 14 21 C 16 21, 19 17, 19 14 C 17 13, 16.5 11, 18 9 C 16 7, 14 7.5, 12 8 Z\"/>", "google": "<path d=\"M20 12 C 20 16.5, 16.5 20, 12 20 C 7.5 20, 4 16.5, 4 12 C 4 7.5, 7.5 4, 12 4 C 14.2 4, 16 4.8, 17.4 6.1 M20 12 H12\"/>", "mail": "<rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M3 8 L12 14 L21 8\"/>", "layout": "<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\"/><path d=\"M12 4 V20 M12 12 H20\"/>", "swap": "<path d=\"M4 8 H18 L14 4 M20 16 H6 L10 20\"/>", "text": "<path d=\"M5 6 H19 M12 6 V20\"/>", "sticker": "<path d=\"M5 5 H19 V13 L13 19 H5 Z M13 19 V13 H19\"/>", "card": "<rect x=\"3\" y=\"6\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M3 10 H21\"/>", "settings": "<circle cx=\"12\" cy=\"12\" r=\"3.2\"/><path d=\"M12 2.5 V5.5 M12 18.5 V21.5 M2.5 12 H5.5 M18.5 12 H21.5 M5.3 5.3 L7.4 7.4 M16.6 16.6 L18.7 18.7 M5.3 18.7 L7.4 16.6 M16.6 7.4 L18.7 5.3\"/>", "heart": "<path d=\"M12 20 C 4 14, 2 9, 5 6 C 8 3, 11 5, 12 8 C 13 5, 16 3, 19 6 C 22 9, 20 14, 12 20 Z\"/>", "mic": "<rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11 C 5 15, 8 18, 12 18 C 16 18, 19 15, 19 11 M12 18 V21\"/>", "camera": "<rect x=\"3\" y=\"7\" width=\"18\" height=\"13\" rx=\"3\"/><circle cx=\"12\" cy=\"13.5\" r=\"3.5\"/><path d=\"M8 7 L10 4 H14 L16 7\"/>", "more": "<circle cx=\"5\" cy=\"12\" r=\"1.6\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\"/><circle cx=\"19\" cy=\"12\" r=\"1.6\"/>", "offline": "<path d=\"M3 3 L21 21 M8.5 16 C 10.5 14.5, 13.5 14.5, 15.5 16 M5 12.5 C 7 10.8, 9 10, 11 9.9 M2 9 C 4 7.2, 6.5 6, 9 5.6 M19 12.5 C 18 11.6, 16.8 10.9, 15.5 10.5\"/><circle cx=\"12\" cy=\"19.5\" r=\"1\"/>", "play": "<path d=\"M8 5 L19 12 L8 19 Z\"/>", "photos": "<rect x=\"7\" y=\"7\" width=\"13\" height=\"13\" rx=\"2.5\"/><path d=\"M4 16 V6 C4 4.9 4.9 4 6 4 H16\"/>", "timeline": "<rect x=\"4\" y=\"4\" width=\"16\" height=\"9\" rx=\"2\"/><path d=\"M4 17 H20 M4 20.5 H14\"/>", "grid": "<rect x=\"4\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"4\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/>"}};
  var uid = 0;
  function nid() { uid += 1; return "ts" + uid; }
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function omit(o, ks) { var r = {}; for (var k in o) if (ks.indexOf(k) < 0) r[k] = o[k]; return r; }
  function v(name) { return "var(--" + name + ")"; }
  function useId() { var r = R.useRef(null); if (!r.current) r.current = nid(); return r.current; }
  function filt(id) { return D.defs.replace('id="__F__"', 'id="' + id + 'f"').replace('id="__R__"', 'id="' + id + 'r"'); }
  function fill(s, id) { return s.split("__F__").join(id + "f").split("__R__").join(id + "r").split("__CLIP__").join(id + "c"); }

  /* ---------------- Brand ---------------- */
  function Character(p) {
    var id = useId(), c = D.chars[p.name || "bo"] || D.chars.bo;
    var pose = c[p.mood || "default"] || c["default"];
    var motion = p.motion === undefined ? c.motion : p.motion;
    var inner = "<defs>" + filt(id) + "</defs><g filter=\"url(#" + id + "f)\">" + fill(pose, id) + "</g>";
    var svg = h("svg", { viewBox: "-6 0 212 200", width: p.size || 120, role: p.decorative ? undefined : "img", "aria-label": p.decorative ? undefined : c.name, "aria-hidden": p.decorative ? "true" : undefined, style: { display: "block", overflow: "visible" }, dangerouslySetInnerHTML: { __html: inner } });
    var mover = motion ? h("div", { className: cx("ts-" + motion, p.delay && "d" + p.delay) }, svg) : svg;
    if (!p.peek) return mover;
    return h("div", { "aria-hidden": "true", className: "ts-peek", style: Object.assign({ transform: "rotate(" + (p.rotate || 0) + "deg)" }, p.peek) }, mover);
  }
  Character.names = Object.keys(D.chars);

  function Hug(p) {
    var id = useId();
    return h("svg", { viewBox: "0 0 240 220", width: p.size || 160, role: "img", "aria-label": "The Hug: Bo the bear with Puddle the duck snuggled against him", style: { display: "block", overflow: "visible" }, dangerouslySetInnerHTML: { __html: "<defs>" + filt(id) + "</defs>" + fill(D.hug, id) } });
  }

  var DOODLES = {
    star: ["0 0 20 20", '<polygon points="10.0,1.0 12.4,6.7 18.6,7.2 13.9,11.3 15.3,17.3 10.0,14.1 4.7,17.3 6.1,11.3 1.4,7.2 7.6,6.7" stroke-width="2.4" fill="C" stroke="C"/>'],
    twinkle: ["0 0 40 40", '<path d="M20 2 C 22 14, 26 18, 38 20 C 26 22, 22 26, 20 38 C 18 26, 14 22, 2 20 C 14 18, 18 14, 20 2 Z" fill="C" stroke="#2D1E2F" stroke-width="2.4" stroke-linejoin="round"/>'],
    heart: ["0 0 28 28", '<path d="M14 25.2 C 0 14, 1.4 1.4, 9.8 2.8 C 12.6 2.8, 14 5.6, 14 8.4 C 14 5.6, 16.8 1.4, 21 2.8 C 28 4.2, 26.6 15.4, 14 25.2" fill="none" stroke="C" stroke-width="3"/>'],
    sparkle: ["0 0 20 20", '<path d="M3 10 L17 10 M10 3 L10 17 M5.1 5.1 L14.9 14.9 M14.9 5.1 L5.1 14.9" fill="none" stroke="C" stroke-width="2.6"/>'],
    sun: ["-4 -4 48 48", '<circle cx="20" cy="20" r="12" fill="none" stroke="C" stroke-width="3"/><path d="M36 20 L43 20 M32.3 30.3 L37.6 34.8 M22.8 35.8 L24 42.7 M12 33.9 L8.5 39.9 M5 25.5 L-1.6 27.9 M5 14.5 L-1.6 12.1 M12 6.1 L8.5 0.1 M22.8 4.2 L24 -2.7 M32.3 9.7 L37.6 5.2" fill="none" stroke="C" stroke-width="3"/><path d="M16 22 q4 4 8 0" fill="none" stroke="C" stroke-width="2.4"/>'],
    zigzag: ["0 0 76 14", '<path d="M2 12 l3 -9 l3 9 l3 -9 l3 9 l3 -9 l3 9 l3 -9 l3 9 l3 -9 l3 9 l3 -9 l3 9 l3 -9 l3 9 l3 -9 l3 9 l3 -9 l3 9 l3 -9 l3 9 l3 -9 l3 9 l3 -9" fill="none" stroke="C" stroke-width="2.6"/>'],
    squiggle: ["0 0 36 36", '<path d="M15 18 c3 -3 7 2 4 5 c-5 5 -12 -2 -8 -8 c5 -8 17 -3 16 7 c-1 11 -15 14 -22 7" fill="none" stroke="C" stroke-width="2.6"/>']
  };
  var DOODLE_INK = { star: "sunshine", twinkle: "sunshine", heart: "tomato", sparkle: "cornflower", sun: "sunshine", zigzag: "forest", squiggle: "rose" };
  function Doodle(p) {
    var id = useId(), d = DOODLES[p.name] || DOODLES.star;
    var col = "var(--" + (p.color || DOODLE_INK[p.name] || "sunshine") + ")";
    var inner = "<defs>" + filt(id) + "</defs><g filter=\"url(#" + id + "r)\" stroke-linecap=\"round\" stroke-linejoin=\"round\">" + d[1].split('"C"').join('"' + col + '"') + "</g>";
    var svg = h("svg", { viewBox: d[0], width: p.size || 28, "aria-hidden": "true", style: { display: "block", overflow: "visible" }, dangerouslySetInnerHTML: { __html: inner } });
    return p.twinkle === false ? svg : h("span", { className: cx("ts-tw-wrap", p.delay && "d" + p.delay), style: { display: "inline-block" } }, svg);
  }
  Doodle.names = Object.keys(DOODLES);

  function Wordmark(p) {
    var size = p.size || 54, off = Math.max(1.3, size / 20);
    var onDark = p.tone === "header";
    return h("span", { className: "ts-wordmark", style: { fontSize: size + "px" }, role: "img", "aria-label": "TeddySteps" },
      h("span", { "aria-hidden": "true", className: "ts-wm-shadow", style: { left: off + "px", top: off + "px", color: onDark ? v("ink") : v("cornflower") } }, "teddysteps"),
      h("span", { "aria-hidden": "true", className: "ts-wm-face", style: { color: onDark ? v("paper") : v("rose"), mixBlendMode: onDark ? "normal" : "multiply" } }, "teddysteps"),
      p.twinkle === false || onDark ? null : h("span", { className: "ts-wm-star", "aria-hidden": "true", style: { right: -(size * 0.43) + "px", top: -(size * 0.19) + "px" } }, h(Doodle, { name: "twinkle", size: Math.round(size * 0.39) })));
  }

  function Monogram(p) {
    var size = p.size || 150, off = Math.round(size / 21);
    return h("span", { className: "ts-wordmark", style: { fontSize: size + "px" }, role: "img", "aria-label": "TeddySteps monogram" },
      h("span", { "aria-hidden": "true", className: "ts-wm-shadow", style: { left: off + "px", top: off + "px", color: v("cornflower") } }, "ts"),
      h("span", { "aria-hidden": "true", className: "ts-wm-face", style: { color: v("rose"), mixBlendMode: "multiply" } }, "ts"));
  }

  /* ---------------- Icon ---------------- */
  function Icon(p) {
    var d = D.icons[p.name] || D.icons.plus;
    return h("svg", { className: "ts-icon", width: p.size || 24, height: p.size || 24, viewBox: "0 0 24 24", role: p.title ? "img" : undefined, "aria-label": p.title, "aria-hidden": p.title ? undefined : "true",
      dangerouslySetInnerHTML: { __html: '<g fill="none" stroke="currentColor" stroke-width="' + (p.weight || 2.2) + '" stroke-linecap="round" stroke-linejoin="round">' + d + "</g>" } });
  }
  Icon.names = Object.keys(D.icons);

  /* ---------------- Actions ---------------- */
  function Button(p) {
    var rest = omit(p, ["variant", "size", "block", "icon", "children", "href", "className"]);
    var cls = cx("ts-btn", "ts-btn-" + (p.variant || "primary"), "ts-btn-" + (p.size || "lg"), p.block && "ts-btn-block", p.className);
    var kids = [p.icon ? h(Icon, { key: "i", name: p.icon, size: 22, weight: 2.6 }) : null, p.children];
    return p.href ? h("a", Object.assign({ className: cls, href: p.href }, rest), kids) : h("button", Object.assign({ type: "button", className: cls }, rest), kids);
  }
  function IconButton(p) {
    var rest = omit(p, ["icon", "label", "tone", "href"]);
    var props = Object.assign({ className: cx("ts-iconbtn", p.tone && "ts-iconbtn-" + p.tone), "aria-label": p.label }, rest);
    var kid = h(Icon, { name: p.icon || "back" });
    return p.href ? h("a", Object.assign({ href: p.href }, props), kid) : h("button", Object.assign({ type: "button" }, props), kid);
  }
  function ChoiceChip(p) {
    return h("label", { className: "ts-choice" }, h("input", Object.assign({ type: p.type || "radio", className: "rc" }, omit(p, ["children", "type"]))), h("span", null, p.children));
  }
  function Switch(p) {
    var id = useId();
    return h("label", { htmlFor: p.id || id, className: "ts-switchrow" },
      h("div", { style: { flex: 1 } }, h("div", { className: "ts-row-title" }, p.label), p.hint ? h("div", { className: "ts-row-body" }, p.hint) : null),
      h("input", Object.assign({ id: p.id || id, type: "checkbox", role: "switch", className: "sw" }, omit(p, ["label", "hint", "id"]))));
  }

  /* ---------------- Forms ---------------- */
  function TextField(p) {
    var id = useId(), fid = p.id || id;
    return h("div", { className: cx("ts-field", p.error && "is-error") },
      h("label", { htmlFor: fid }, p.label),
      h("input", Object.assign({ id: fid, type: "text", "aria-describedby": (p.hint || p.error) ? fid + "h" : undefined, "aria-invalid": p.error ? "true" : undefined }, omit(p, ["label", "hint", "error", "id"]))),
      (p.hint || p.error) ? h("div", { id: fid + "h", className: "ts-hint" }, p.error || p.hint) : null);
  }
  function CodeInput(p) {
    var n = p.length || 6, val = String(p.value || ""), boxes = [];
    for (var i = 0; i < n; i++) boxes.push(h("span", { key: i, className: cx("ts-code-box", i === val.length && "is-next") }, val.charAt(i)));
    return h("div", { className: "ts-code", role: "group", "aria-label": p.label || "6-digit code" }, boxes);
  }

  /* ---------------- Navigation ---------------- */
  function Scallop(p) {
    var d = "M0 0 H1000 V8", x;
    for (x = 1000; x > 0; x -= 50) d += " Q" + (x - 12.5) + " 18 " + (x - 25) + " 8 Q" + (x - 37.5) + " 6 " + (x - 50) + " 8";
    d += " Z";
    return h("svg", { viewBox: "0 0 1000 24", width: "100%", height: 22, preserveAspectRatio: "none", "aria-hidden": "true", style: { display: "block", marginTop: -1 } }, h("path", { d: d, fill: v(p.color || "lilac") }));
  }
  function StepProgress(p) {
    var n = p.total || 6, s = [];
    for (var i = 0; i < n; i++) s.push(h("div", { key: i, className: cx("ts-step", i < (p.current || 1) && "is-done") }));
    return h("div", { className: "ts-steps" }, h("div", { className: "ts-steps-bar", "aria-hidden": "true" }, s), h("div", { className: "ts-steps-label" }, (p.current || 1) + " of " + n));
  }
  function ScreenHeader(p) {
    var band = p.color || "lilac";
    return h("div", { className: "ts-header" },
      h("div", { className: "ts-header-band", style: { background: v(band) } },
        p.back || p.action ? h("div", { className: "ts-header-bar" }, p.back ? h(IconButton, { icon: "back", label: "Back", href: p.back === true ? "#" : p.back }) : h("span", { style: { width: 44 } }), h("div", null, p.action || null)) : h("div", { style: { height: 22 } }),
        p.step ? h(StepProgress, { current: p.step[0], total: p.step[1] }) : null,
        h("h1", { className: "ts-title-l", style: { maxWidth: p.character ? 240 : "none", marginTop: p.step ? 14 : 0 } }, p.title),
        p.subtitle ? h("div", { className: "ts-header-sub" }, p.subtitle) : null,
        p.children),
      h(Scallop, { color: band }),
      p.character ? h(Character, { name: p.character, size: 88, decorative: true, rotate: p.characterRotate || 6, peek: p.step ? { position: "absolute", right: -18, top: 70 } : { position: "absolute", right: 14, top: p.back ? 18 : 4 } }) : null);
  }
  // Two tabs either side of the +, so it sits in the middle; Hugs (T6) took the Book tab's place while
  // the year book is in the backlog (owner, 20 and 21 October 2026).
  var TABS = [{ id: "trail", label: "Trail", icon: "trail" }, { id: "family", label: "Family", icon: "family" }, { id: "add", label: "Add a moment", icon: "plus", add: true }, { id: "hugs", label: "Hugs", icon: "heart" }, { id: "me", label: "Me", icon: "me" }];
  function TabBar(p) {
    var st = R.useState(p.active || "trail"), act = p.onChange ? p.active : st[0];
    return h("nav", { className: "ts-tabbar", "aria-label": "Main" }, TABS.map(function (t) {
      var on = t.id === act;
      if (t.add) return h("button", { key: t.id, type: "button", className: "ts-btn ts-fab", "aria-label": t.label, onClick: function () { if (p.onAdd) p.onAdd(); } }, h(Icon, { name: "plus", size: 28, weight: 3 }));
      return h("button", { key: t.id, type: "button", className: cx("ts-tab", on && "is-on"), "aria-current": on ? "page" : undefined, onClick: function () { st[1](t.id); if (p.onChange) p.onChange(t.id); } },
        on ? h("span", { className: "ts-tab-pill" }, h(Icon, { name: t.icon, size: 22, weight: 2.6 })) : h(Icon, { name: t.icon, size: 24, weight: 2 }), h("span", null, t.label));
    }));
  }

  /* ---------------- Content ---------------- */
  function Sticker(p) { return h("span", { className: cx("ts-sticker", "ts-sticker-" + (p.tone || "sunshine")) }, p.icon ? h(Icon, { name: p.icon, size: 16, weight: 2.6 }) : null, p.children); }
  function Avatar(p) {
    var s = p.size || 44;
    return h("span", { className: "ts-avatar", "aria-hidden": p.decorative ? "true" : undefined, title: p.name, style: { width: s, height: s, fontSize: Math.round(s * 0.45), background: v(p.tone || "pistachio") } }, (p.name || "?").replace(/^(Oma|Opa|Tante|Oom) /, "").charAt(0));
  }
  // Pad 2.0: a straight album page. Photo(s) to the edge at a fixed height, the parent's line as the
  // title, a calm first-time label (icon and colour per kind), date and hugs at the bottom.
  // `tilt` is gone: cards stand straight. Up to three `photos` (urls) in fixed layouts, "+N" beyond.
  function MomentCard(p) {
    var Tag = p.href ? "a" : "article";
    var srcs = p.photos || (p.src ? [p.src] : []);
    var count = p.photoCount || srcs.length;
    var tile = function (src, i, more) {
      return h("div", { key: i, className: "ts-moment-tile", style: { background: src ? "center/cover url(" + src + ")" : v(p.tint || "lilac") } },
        src ? null : h(Character, { name: p.character || "bo", mood: "happy", size: 88, decorative: true, motion: null }),
        more ? h("span", { className: "ts-moment-more" }, "+" + more) : null);
    };
    var shown = srcs.length ? srcs.slice(0, 3) : [null];
    var photos = shown.length < 3
      ? h("div", { className: "ts-moment-photos" }, shown.map(function (src, i) { return tile(src, i); }))
      : h("div", { className: "ts-moment-photos is-three" }, tile(shown[0], 0), h("div", { className: "ts-moment-col" }, tile(shown[1], 1), tile(shown[2], 2, count > 3 ? count - 3 : 0)));
    var first = p.first ? h("span", { className: "ts-first" },
      h("span", { className: "ts-first-icon", style: { background: v(p.first.tone || "butter") } }, h("svg", { width: 15, height: 15, viewBox: "0 0 24 24", "aria-hidden": "true" }, h("path", { d: p.first.icon, fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" }))),
      (/^eerste\b/i.test(p.first.label) ? p.first.label : "Eerste keer · " + p.first.label)) : null;
    return h(Tag, { href: p.href, className: cx("ts-moment", p.layout === "compact" && "is-compact") },
      h("div", { className: "ts-moment-pics", role: srcs.length ? "img" : undefined, "aria-label": srcs.length ? p.alt : undefined }, photos),
      h("div", { className: "ts-moment-foot" },
        p.week ? h("div", { className: "ts-eyebrow" }, p.week) : null,
        first,
        p.caption ? h("div", { className: "ts-moment-title" }, p.caption) : null,
        p.note ? h("div", { className: "ts-meta ts-muted" }, p.note) : null,
        p.date || p.hugs != null ? h("div", { className: "ts-moment-meta" }, h("span", null, p.date || ""),
          p.hugs != null ? h("span", { className: "ts-moment-hugs", "aria-label": p.hugs + (p.hugs === 1 ? " knuffel" : " knuffels") }, h(Icon, { name: "heart", size: 16, weight: 2.6 }), p.hugs) : null) : null));
  }
  function RangeBar(p) {
    var lo = p.start != null ? p.start : p.from, hi = p.end != null ? p.end : p.to, max = p.max || 18, a = lo / max * 100, b = hi / max * 100;
    var now = p.now != null ? Math.min(p.now, max) / max * 100 : null;
    return h("div", { className: "ts-range" },
      h("div", { className: "ts-row-title", style: { fontSize: 14 } }, p.label),
      h("div", { className: "ts-range-track", role: "img", "aria-label": "Typically " + lo + " to " + hi + " months" + (p.now != null ? ", now " + p.now + " months" : "") },
        h("div", { className: "ts-range-band", style: { left: a + "%", width: (b - a) + "%" } }),
        now != null ? h("div", { className: "ts-range-now", style: { left: "calc(" + now + "% - 12px)" } }) : null),
      h("div", { className: "ts-range-axis" }, h("span", null, "birth"), h("span", null, "9 months"), h("span", null, "18 months")),
      h("div", { className: "ts-meta" }, p.note || "Typical range, never a target."));
  }
  function ListRow(p) {
    var Tag = p.href || p.onClick ? "a" : "div";
    return h(Tag, { href: p.href || (p.onClick ? "#" : undefined), onClick: p.onClick, className: cx("ts-listrow", p.danger && "is-danger") },
      p.icon ? h(Icon, { name: p.icon }) : null,
      h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { className: "ts-row-title" }, p.title), p.subtitle ? h("div", { className: "ts-meta ts-muted" }, p.subtitle) : null),
      p.chevron === false ? null : h("span", { className: "ts-muted" }, h(Icon, { name: "chevron-right", size: 20 })));
  }
  function PersonRow(p) {
    return h("div", { className: "ts-personrow" }, h(Avatar, { name: p.name, tone: p.tone, decorative: true }),
      h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { className: "ts-row-title" }, p.name), h("div", { className: "ts-meta ts-muted" }, p.role)),
      p.action ? h("a", { href: "#", className: "ts-textlink" }, p.action) : null);
  }
  function Callout(p) {
    return h("div", { className: "ts-callout", style: { background: v(p.tone || "lilac"), transform: "rotate(" + (p.tilt == null ? -1 : p.tilt) + "deg)" } },
      h("div", { style: { flex: 1 } }, h("div", { className: "ts-row-title", style: { fontSize: 15 } }, p.title), p.children ? h("div", { className: "ts-meta" }, p.children) : null),
      p.action ? h(Button, { size: "md", variant: "sunshine", href: p.href || "#" }, p.action) : null);
  }
  function EmptySlot(p) {
    return h("a", { href: p.href || "#", className: "ts-emptyslot" }, h("span", { className: "ts-emptyslot-plus" }, h(Icon, { name: "plus", size: 20, weight: 3 })),
      h("div", null, h("div", { className: "ts-row-title", style: { fontSize: 15 } }, p.title || "This week is still empty!"), h("div", { className: "ts-meta ts-muted" }, p.subtitle || "add a moment")));
  }
  var COVER_INK = ["tangerine", "cornflower", "forest", "sunshine", "rose"];
  function BookCover(p) {
    var name = (p.name || "Lotte").toUpperCase(), size = p.size || 240;
    var letters = name.split("").map(function (c, i) { return h("span", { key: i, style: { color: v(COVER_INK[i % COVER_INK.length]) } }, c); });
    return h("div", { className: "ts-book", role: "img", "aria-label": "Book cover: " + (p.name || "Lotte") + ", " + (p.subtitle || "year one"), style: { width: size, height: size, background: v(p.color || "cornflower"), transform: "rotate(" + (p.tilt == null ? -4 : p.tilt) + "deg)" } },
      h("svg", { viewBox: "0 0 200 200", width: "100%", height: "100%", "aria-hidden": "true", style: { position: "absolute", inset: 0 } }, h("path", { d: "M12 12 Q18.3 7 24.6 12 T37.1 12 T49.7 12 T62.3 12 T74.9 12 T87.4 12 T100 12 T112.6 12 T125.1 12 T137.7 12 T150.3 12 T162.9 12 T175.4 12 T188 12 Q193 18.3 188 24.6 T188 37.1 T188 49.7 T188 62.3 T188 74.9 T188 87.4 T188 100 T188 112.6 T188 125.1 T188 137.7 T188 150.3 T188 162.9 T188 175.4 T188 188 Q181.7 193 175.4 188 T162.9 188 T150.3 188 T137.7 188 T125.1 188 T112.6 188 T100 188 T87.4 188 T74.9 188 T62.3 188 T49.7 188 T37.1 188 T24.6 188 T12 188 Q7 181.7 12 175.4 T12 162.9 T12 150.3 T12 137.7 T12 125.1 T12 112.6 T12 100 T12 87.4 T12 74.9 T12 62.3 T12 49.7 T12 37.1 T12 24.6 T12 12 Z", fill: v("paper"), stroke: v("forest"), strokeWidth: 2.6 })),
      h("div", { className: "ts-book-words", style: { fontSize: size * 0.19 } }, h("span", { className: "ts-book-name" }, letters), h("span", { className: "ts-book-sub", style: { fontSize: size * 0.08 } }, p.subtitle || "year one!")),
      h("div", { style: { position: "absolute", right: size * 0.06, bottom: -size * 0.02 } }, h(Character, { name: "bo", size: size * 0.34, decorative: true, motion: null })),
      h("div", { style: { position: "absolute", left: size * 0.08, bottom: size * 0.04 } }, h(Character, { name: "puddle", size: size * 0.22, decorative: true, motion: null })));
  }
  function VoiceNote(p) {
    var bars = [6, 12, 18, 10, 16, 22, 14, 8, 18, 12, 20, 9, 15, 7, 13, 18, 10, 6];
    return h("div", { className: "ts-voice" }, h("button", { type: "button", className: "ts-voice-play", "aria-label": "Play voice note from " + (p.from || "Oma Ria") }, h(Icon, { name: "play", size: 20, weight: 2.4 })),
      h("div", { style: { flex: 1, minWidth: 0 } }, h("div", { className: "ts-row-title", style: { fontSize: 14 } }, (p.from || "Oma Ria") + " · " + (p.length || "0:14")),
        h("div", { className: "ts-voice-wave", "aria-hidden": "true" }, bars.map(function (b, i) { return h("span", { key: i, style: { height: b } }); }))));
  }
  function HandNote(p) { return h("div", { className: "ts-hand", style: { color: v(p.color || "ink"), transform: "rotate(" + (p.tilt == null ? -4 : p.tilt) + "deg)", fontSize: p.size === "s" ? 15 : 19 } }, p.children); }
  function HugToast(p) {
    return h("div", { className: "ts-hugtoast", role: "status" }, h("span", { className: "ts-hugtoast-badge" }, h(Hug, { size: 50 })),
      h("div", { style: { minWidth: 0 } }, h("div", { className: "ts-row-title", style: { fontSize: 15 } }, p.title || "Oma sent a hug"), p.children ? h("div", { className: "ts-meta" }, p.children) : null));
  }
  function Banner(p) {
    return h("div", { className: "ts-banner", role: "status", style: { background: v(p.tone || "butter") } }, h(Icon, { name: p.icon || "offline" }), h("div", { style: { flex: 1 } }, h("div", { className: "ts-row-title", style: { fontSize: 15 } }, p.title), p.children ? h("div", { className: "ts-meta" }, p.children) : null));
  }


  /* ---------------- Leaps: what's coming next ---------------- */
  var LEAPS = [5, 8, 12, 17, 26, 36, 44, 53, 62, 73];
  function LeapTimeline(p) {
    var end = p.end || 52, now = p.now != null ? p.now : 0;
    var leaps = (p.leaps || LEAPS).filter(function (w) { return w <= end; });
    var next = null; leaps.forEach(function (w) { if (next == null && w > now) next = w; });
    var pct = function (w) { return Math.min(100, w / end * 100); };
    var marks = leaps.map(function (w, i) {
      var st = w <= now ? "is-past" : (w === next ? "is-next" : "is-future");
      return h("div", { key: w, className: "ts-leap " + st, style: { left: pct(w) + "%" } },
        h("span", { className: "ts-leap-dot" }, w === next ? h(Doodle, { name: "twinkle", size: 18, twinkle: true }) : String(i + 1)),
        w === next ? h("span", { className: "ts-leap-tag" }, (p.nextLabel || "Next leap") + " · " + (p.nextWeekWord || p.weekWord || "week") + " " + w) : null);
    });
    var axis = p.axis || [0, 13, 26, 39, 52];
    var axisLabels = p.axisLabels || axis.map(function (w) { return (p.weekWord || "week") + " " + w; });
    return h("div", { className: "ts-leaps", role: "img", "aria-label": p.label || ("Leaps around weeks " + leaps.join(", ") + "; now week " + now) },
      h("div", { className: "ts-leaps-track" },
        h("div", { className: "ts-leaps-done", style: { width: pct(now) + "%" } }),
        marks,
        h("div", { className: "ts-leaps-now", style: { left: pct(now) + "%" } }, h("span", { className: "ts-leaps-now-tag" }, (p.nowLabel || "Now") + " · " + (p.weekWord || "week") + " " + now))),
      h("div", { className: "ts-leaps-axis", "aria-hidden": "true" }, axisLabels.map(function (l, i) { return h("span", { key: i }, l); })));
  }
  LeapTimeline.weeks = LEAPS;

  function NextUp(p) {
    return h("div", { className: "ts-nextup", style: { background: v(p.tone || "white") } },
      h("div", { className: "ts-nextup-head" },
        h("div", { style: { minWidth: 0 } }, h("div", { className: "ts-eyebrow" }, p.eyebrow || "Coming up"), h("div", { className: "ts-title-s", style: { fontSize: 22, lineHeight: "26px", marginTop: 2 } }, p.title), p.when ? h("div", { className: "ts-meta ts-muted", style: { marginTop: 2 } }, p.when) : null),
        p.character ? h(Character, { name: p.character, size: 74, decorative: true }) : null),
      p.items ? h("ul", { className: "ts-nextup-list" }, p.items.map(function (t, i) { return h("li", { key: i }, t); })) : null,
      p.children ? h("div", { className: "ts-row-body", style: { color: "var(--ink)" } }, p.children) : null);
  }

  var api = { LeapTimeline: LeapTimeline, NextUp: NextUp, Wordmark: Wordmark, Monogram: Monogram, Character: Character, Hug: Hug, Doodle: Doodle, Icon: Icon, Button: Button, IconButton: IconButton, ChoiceChip: ChoiceChip, Switch: Switch, TextField: TextField, CodeInput: CodeInput, ScreenHeader: ScreenHeader, StepProgress: StepProgress, TabBar: TabBar, Sticker: Sticker, MomentCard: MomentCard, RangeBar: RangeBar, ListRow: ListRow, PersonRow: PersonRow, Avatar: Avatar, Callout: Callout, EmptySlot: EmptySlot, BookCover: BookCover, VoiceNote: VoiceNote, HandNote: HandNote, HugToast: HugToast, Banner: Banner, Scallop: Scallop };
  window.TeddySteps = window.TeddySteps || {};
  Object.assign(window.TeddySteps, api);
})();
