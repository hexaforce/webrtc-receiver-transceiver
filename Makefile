CC	:= gcc
ifeq ($(shell uname), Darwin)
  LIBS := $(shell PKG_CONFIG_PATH=/usr/local/opt/libsoup@2/lib/pkgconfig pkg-config --libs --cflags glib-2.0 json-glib-1.0 libsoup-2.4)
else
  LIBS := $(shell pkg-config --libs --cflags glib-2.0 json-glib-1.0 libsoup-2.4)
endif
CFLAGS	:= -O0 -ggdb -Wall -fno-omit-frame-pointer

all: clean webrtc-soup

webrtc-soup: webrtc-soup.c
	"$(CC)" $(CFLAGS) $^ $(LIBS) -o $@

clean:
	rm -f webrtc-soup
	rm -rf webrtc-soup.dSYM

fmt:
	find . -name '*.h' -o -name '*.c' | xargs clang-format -i

clear:
	rm -rf  ~/.cache/gstreamer-1.0
