/*!

   MPEG-DASH engine plugin for Flowplayer HTML5 version 5.x

   Copyright 2015 Flowplayer Oy

   Released under the MIT License:
   http://www.opensource.org/licenses/mit-license.php

   Includes dash.all.js:
   Copyright (c) 2015, Dash Industry Forum. **All rights reserved.
   https://github.com/Dash-Industry-Forum/dash.js/blob/development/LICENSE.md

   requires:
   - Flowplayer HTML5 version 5.x
   - dash.js https://github.com/Dash-Industry-Forum/dash.js

*/

(function ($) {
    if (!flowplayer.support.video || !window.MediaSource) {
        return;
    }


    flowplayer.engine.mpegdash = function (player, root) {
        var mediaPlayer,
            videoTag,
            context = new Dash.di.DashContext();

        return {
            pick: function (sources) {
                var i;

                for (i = 0; i < sources.length; i++) {
                    if (sources[i].type === "application/dash+xml") {
                        return sources[i];
                    }
                }
            },
            load: function (video) {
                root.find('video').remove();
                videoTag = $("<video/>")[0];
                $(videoTag).on('play', function () {
                    root.trigger('resume', [player]);
                });
                $(videoTag).on('pause', function () {
                    root.trigger('pause', [player]);
                });
                $(videoTag).on('timeupdate', function () {
                    root.trigger('progress', [player, videoTag.currentTime]);
                });
                $(videoTag).on('loadeddata', function () {
                    video.duration = video.seekable = videoTag.duration;
                    root.trigger('ready', [player, video]);

                    if (player.conf.autoplay) {
                        // let the fp API take care of autoplay
                        // otherwise dash.js triggers play when seeking to
                        // unbuffered positions
                        videoTag.play();
                    }
                });
                $(videoTag).on('seeked', function () {
                    root.trigger('seek', [player, videoTag.currentTime]);
                });
                $(videoTag).on('progress', function (e) {
                    try {
                        var buffered = videoTag.buffered,
                                buffer = buffered.end(0), // first loaded buffer
                                ct = videoTag.currentTime,
                                buffend = 0,
                                i;

                        // buffered.end(null) will not always return the current buffer
                        // so we cycle through the time ranges to obtain it
                        if (ct) {
                            for (i = 1; i < buffered.length; i++) {
                                buffend = buffered.end(i);

                                if (buffend >= ct && buffered.start(i) <= ct) {
                                    buffer = buffend;
                                }
                            }
                        }
                        video.buffer = buffer;
                    } catch (ignored) {}
                    root.trigger('buffer', [player, e]);
                });
                $(videoTag).on('ended', function () {
                    root.trigger('finish', [player]);
                });
                $(videoTag).on('volumechange', function () {
                    root.trigger('volume', [player, videoTag.volume]);
                });


                videoTag.className = 'fp-engine dash-engine';
                root.prepend(videoTag);

                mediaPlayer = new MediaPlayer(context);
                mediaPlayer.startup();
                mediaPlayer.attachView(videoTag);

                // caching can cause failures in playlists
                // for the moment disable entirely
                mediaPlayer.enableLastBitrateCaching(false);
                // handled by fp API
                mediaPlayer.setAutoPlay(false);
                // for seeking in paused state
                mediaPlayer.setScheduleWhilePaused(true);

                mediaPlayer.addEventListener("error", function (e) {
                    var fperr;
                    switch (e.error) {
                    case "download":
                        fperr = 4;
                        break;
                    case "mediasource": case "manifestError":
                        fperr = 3;
                        break;
                    default:
                        fperr = 5;
                    }
                    player.trigger('error', [player, {code: fperr, video: video}]);
                }, false);

                mediaPlayer.attachSource(video.src);
            },
            resume: function () {
                videoTag.play();
            },
            pause: function () {
                videoTag.pause();
            },
            seek: function (time) {
                videoTag.currentTime = time;
            },
            volume: function (level) {
                if (videoTag) {
                    videoTag.volume = level;
                }
            },
            speed: function (val) {
                videoTag.playbackRate = val;
                root.trigger('speed', [player, val]);
            },
            unload: function () {
                root.trigger("unload", [player]);
                mediaPlayer.reset();
            }

        };

    };

    $(function () {
        // hack: globally force dash engine, but allow other global config
        flowplayer.conf.engine = "mpegdash";
    });

}(jQuery));
